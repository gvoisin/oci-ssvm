import { useEffect, useRef } from "react";
import { Link, Outlet, useLoaderData, Form, useMatches, useFetcher, useTransition } from "@remix-run/react";
import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node"
import { json } from "@remix-run/node";
import { getCompartments, getInstances, actionInstance, getInstancePrimaryPrivateIp, defaultTagNs, defaultTagName, defaultTagValue, defaultTagNames } from "~/oci";
import { InstanceLifecycleState } from "~/constants";

import {
  Select,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  TableCaption,
  TableContainer,
} from '@chakra-ui/react'


export async function loader({ request, params }: LoaderArgs) {
  const compartmentName = params.compartment as string;

  // First Get list of compartments
  const allCompartments = await getCompartments({
      tenancy: ""
  });
  const compartments = allCompartments.filter(compartment => compartment.lifecycleState === 'ACTIVE')
  const selectedCompartment = allCompartments.find(compartment => compartment.name === compartmentName)
  const selectedCompartmentId = selectedCompartment?.id;
//  const selectedCompartment = compartments.find(compartment => compartment.id === compartmentId).name;

  const vmInstances = await getInstances(selectedCompartmentId);

  console.log(defaultTagNames);
  // Filter with Tags to only get Dev workstations : vmtypes->dev->workstation
  let listWorkstations = vmInstances?.filter(function (vmInstance) {
    return vmInstance.definedTags["vmtypes"] && (vmInstance.definedTags[defaultTagNs]["dev"] === defaultTagValue) && vmInstance.lifecycleState !== InstanceLifecycleState.Terminated;
  })

  const addVnic = async (instance) => {
    const vnic = await getInstancePrimaryPrivateIp(instance)
    return  { ...instance, vnic}
  }
  const workstations = await Promise.all(listWorkstations.map((addVnic)))

  return { selectedCompartment, compartments, workstations };
}

export const action: ActionFunction = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  const { intent, ...values } = Object.fromEntries(formData)

  console.log(Object.fromEntries(formData))
  switch (intent) {
    case "update-compartment": {
      const selectedCompartmentId = formData?.get("compartment");
      console.log(selectedCompartmentId);
      console.log("update-compartment");
      return redirect((`workstations/${selectedCompartmentId}`))

    }
    case "start-instance": {
      const instanceId = formData?.get("id")
      return actionInstance(instanceId, "START")

    }
    case "stop-instance": {
      const instanceId = formData?.get("id")
      return actionInstance(instanceId, "STOP")

    }
    case "refresh-workstations": {
      console.log("refresh-workstations");

    }
  }
  return null;
}

export default function WorkstationsRoute() {
  const createFetcher = useFetcher();
  const { selectedCompartment, compartments, workstations } = useLoaderData()

  // const isRefreshing =  compartmentListForm.state === "submitting";
  const workstationsNotFound = workstations && workstations.length === 0;
  let loadingMessage = "Loading";

  const compartmentListForm = useFetcher();
  const refreshForm = useFetcher();
  
  const hidden:boolean = true;
  let isBusy = compartmentListForm.submission || refreshForm.submission;
  if (compartmentListForm.submission) { 
    loadingMessage = loadingMessage + " workstations from compartment " + compartmentListForm.submission.formData.get("compartment");
  }

  return (
    <div className="relative h-full grid grid-cols-4 gap-4 p-10">
      <h1 className="font-display text-d-h3 text-black col-span-4">Workstations</h1>
        <div className="items-center py-2 w-50 col-span-2">
          <compartmentListForm.Form
              method="post"
              className="items-center"
              hidden={!hidden}>
              <input type="hidden" name="intent" value="update-compartment" />
              <Select
                  name="compartment"
                  className="items-center"
                  placeholder='Select option' 
                  onChange={(e) => compartmentListForm.submit(e.target.form)}
                  defaultValue={selectedCompartment.name} >
                {compartments.map((option) => (
                    <option key={option.id} value={option.name} label={option.name}></option>        ))}
                </Select>
            </compartmentListForm.Form>
        </div>
        <div className="items-center p-2 col-span-1">
        <refreshForm.Form
            method="post"
            className="refresh">
              <input type="hidden" name="intent" value="refresh-workstations" />
              <button
                action="submit"
                className="bg-blue-300 p-2  w-40 mx-40 rounded hover:bg-blue-600 hover:text-white shadow-lg"
                disabled={isBusy}
                aria-label="Refresh"
                name="_action"
                value="refresh">{isBusy ? 'Refreshing' : 'Refresh'}</button>
            </refreshForm.Form>


        </div>
      <div className="overflow-hidden rounded-lg border border-gray-200 col-span-4">
        { !isBusy ? (<div>
          { workstationsNotFound ?
            (<div className="p-12 text-red-500">No workstations found in this compartment <strong>{selectedCompartment.name}</strong></div>) 
            : (
              <TableContainer>
                <Table variant='simple' colorScheme='teal'>
                  <Thead>
                    <Tr>
                      <th className="border border-gray-100 py-2 px-4"></th>
                      <th className="border border-gray-100 py-2 px-4">Name</th>
                      <th className="border border-gray-100 py-2 px-2">State</th>
                      <th className="border border-gray-100 py-2 px-4">Private IP</th>
                      <th className="border border-gray-100 py-2 px-2">Shape</th>
                      <th className="border border-gray-100 py-2 px-2">OCPU</th>
                      <th className="border border-gray-100 py-2 px-2">Memory (GB)</th>
                      <th className="border border-gray-100 py-2 px-2">Action</th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {workstations.map((workstation) => (
                        <InstanceItem instance={workstation} key={workstation.id} />
                      ))}
                  </Tbody>
                </Table>
              </TableContainer>
            )
          }
        </div>) : (<div>{loadingMessage} ...</div>)}
      </div>
      <Outlet />
    </div>
  );
}


function InstanceItem({instance}, key) {
  const transition = useTransition();

  const isSubmitting = transition.submission?.formData.get("id") === instance.id;

  let isStartable, isStoppable, isHidden = false;
  let rowColor =  "bg-yellow-100";

  switch (instance.lifecycleState)  {
    case  InstanceLifecycleState.Running:
        rowColor = "bg-green-50";
        isStartable = false;
        isStoppable = true;
        break;
    case  InstanceLifecycleState.Stopped:
        rowColor = "bg-red-100";
        isStartable = true;
        isStoppable = false;
        break;
    default:
      isStartable = true;
      isStoppable = true;

  }

  return (
    <Tr className={rowColor}>
      <Td className="border border-gray-100 py-2 px-4">
      </Td>
      <Td className="border border-gray-100 py-2 px-4 text-center">
        {instance.displayName}
      </Td>
      <Td className="border border-gray-100 py-2 px-2">
        <StatusLabel statusType={instance.lifecycleState}>
          {instance.lifecycleState}
        </StatusLabel>
      </Td>
      <Td className="border border-gray-100 py-2 px-4">
        {instance.vnic}
      </Td>
      <Td className="border border-gray-100 py-2 px-2">
        {instance.shape}
      </Td>
      <Td className="border border-gray-100 py-2 px-2">
        {instance.shapeConfig.ocpus}
      </Td>
      <Td className="border border-gray-100 py-2 px-2">
        {instance.shapeConfig.memoryInGBs}
      </Td>
      <Td>
      <Form
          method="post"
          className="update-compartment">
          <input type="hidden" name="id" value={instance.id} />
          <input type="hidden" name="name" value={instance.displayName} />
          <input type="hidden" name="intent" value="start-instance" />
          <button
            type='submit'
            className="bg-green-300 p-2  w-20 mx-20 rounded  hover:bg-green-600 hover:text-white"
            hidden={isStoppable}
            disabled={!isStartable}
            aria-label="start"
            name="_action"
            value="start">{isSubmitting ? 'Starting' :  'Start'}</button>
      </Form>
      <Form
          method="post"
          className="update-compartment">
          <input type="hidden" name="id" value={instance.id} />
          <input type="hidden" name="name" value={instance.displayName} />
          <input type="hidden" name="intent" value="stop-instance" />
          <button
            type='submit'
            className="bg-red-300 p-2  w-20 mx-20 rounded  hover:bg-red-600 hover:text-white"
            hidden={isStartable}
            disabled={!isStoppable}
            aria-label="stop"
            name="_action"
            value="stop">{isSubmitting ? 'Stopping' : 'Stop'}</button>
      </Form>
      </Td>
    </Tr>

  )
}

function StatusLabel({
  statusType,
  children,
  ...rest
})  {

  // const colors = getStyles(statusType)

  // // Because the text and icon colors don't match(some times) we need to map them.
  // const labelProps = {
  //   ...rest,
  //   role: showRole ? Roles.Status : undefined,
  //   "data-test-id": testId,
  //   className: classNames("oui-display-inline-block", colors.text),
  // }

  // TODO: Fix the wacky spread operator
  // https://jira.oci.oraclecorp.com/browse/CDX-1663
  return (
<span className="oui-flex oui-flex-middle">
  <span role="status" className="lowercase rounded">
    {/* <span data-oui-icon="icon: circle; ratio: 0.7" 
          className="rounded-full">
      <svg width="14" height="14" viewBox="0 0 20 20" focusable="false" xmlns="http://www.w3.org/2000/svg" ratio="0.7"> 
        <circle cx="10" cy="10" r="9"> </circle>
      </svg>
    </span> */}
    {children}
  </span>
</span>
  )
}


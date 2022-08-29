import { useEffect, useRef } from "react";
import { Link, Outlet, useLoaderData, Form, useMatches, useFetcher, useTransition } from "@remix-run/react";
import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node"
import { json } from "@remix-run/node";
import { getCompartments, getWorkstations, startInstance } from "~/oci";

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
  const compartments = await getCompartments({
      tenancy: ""
  });
  const selectedCompartment = compartments.find(compartment => compartment.name === compartmentName)
  const selectedCompartmentId = selectedCompartment?.id;
//  const selectedCompartment = compartments.find(compartment => compartment.id === compartmentId).name;

  const vmInstances = await getWorkstations(selectedCompartmentId);

  // Filter with Tags to only get Dev workstations : vmtypes->dev->workstation
  let workstations = vmInstances?.filter(function (vmInstance) {
    return vmInstance.definedTags["vmtypes"] && (vmInstance.definedTags["vmtypes"]["dev"] === "workstation");
  })

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
      return startInstance(instanceId)

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
  const hidden:boolean = true;
  let isBusy = compartmentListForm.submission;
  if (compartmentListForm.submission) { 
    loadingMessage = loadingMessage + " workstations from compartment " + compartmentListForm.submission.formData.get("compartment");
  }

  return (
    <div className="relative h-full p-10">
      <h1 className="font-display text-d-h3 text-black">Workstations</h1>
      <div className=" p-8">
        <div className=" p-5">
        {/* <SelectCompartment compartments={compartments} /> */}
        <compartmentListForm.Form
            method="post"
            className="update-compartment"
            hidden={!hidden}>
            <input type="hidden" name="intent" value="update-compartment" />
            <Select
                size='md' 
                name="compartment"
                placeholder='Select option' 
                onChange={(e) => compartmentListForm.submit(e.target.form)}
                defaultValue={selectedCompartment.name} >
              {compartments.map((option) => (
                  <option key={option.id} value={option.name} label={option.name}></option>        ))}
              </Select>
          </compartmentListForm.Form>
        </div>
        <div className=" p-2">
        <Form
            method="POST"
            className="refresh">
              <input type="hidden" name="intent" value="refresh-workstations" />
              <button
                action="submit"
                disabled={isBusy}
                aria-label="Refresh"
                name="_action"
                value="refresh">{isBusy ? 'Refreshing' : 'Refresh'}</button>
            </Form>


        </div>
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        { !isBusy ? (<div>
          { workstationsNotFound ?
            (<div className="p-12 text-red-500">No workstations found in this compartment <strong>{selectedCompartment.name}</strong></div>) 
            : (
              <TableContainer>
                <Table variant='striped' colorScheme='teal'>
                  <Thead>
                    <Tr>
                      <th className="border border-gray-100 py-2 px-4"></th>
                      <th className="border border-gray-100 py-2 px-4">Name</th>
                      <th className="border border-gray-100 py-2 px-4">Region</th>
                      <th className="border border-gray-100 py-2 px-2">Status</th>
                      <th className="border border-gray-100 py-2 px-2">AD</th>
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

  const isSubmitting = transition.state === "submitting";
  const isNotStartable =  instance.lifecycleState !== 'STOPPED'

  return (
    <Tr>
      <Td className="border border-gray-100 py-2 px-4">
      </Td>
      <Td className="border border-gray-100 py-2 px-4 text-center">
        {instance.displayName}
      </Td>
      <Td className="border border-gray-100 py-2 px-4">
        {instance.region}
      </Td>
      <Td className="border border-gray-100 py-2 px-2">
        {instance.lifecycleState}
      </Td>
      <Td className="border border-gray-100 py-2 px-2">
        {instance.availabilityDomain}
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
            disabled={isNotStartable}
            aria-label="start"
            name="_action"
            value="start">{isSubmitting ? 'Starting' : isNotStartable ? ' -' : 'Start'}</button>
      </Form>
      </Td>
    </Tr>

  )
}
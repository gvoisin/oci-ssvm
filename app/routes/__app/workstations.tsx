import { useEffect, useRef } from "react";
import { Link, Outlet, useLoaderData, Form, useMatches, useFetcher } from "@remix-run/react";
import type { ActionFunction, LoaderFunction } from "@remix-run/node"
import { json } from "@remix-run/node";
import { provider,getCompartments, getWorkstations } from "~/oci";

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

export async function loader({ request }: LoaderArgs) {
  const tenancy = provider.getTenantId();
  const workstations = await getWorkstations({
    tenancy: tenancy || ""
  });
  const compartments = await getCompartments({
    tenancy: tenancy || ""
  });
  return { compartments, workstations };
}

export const action: ActionFunction = async ({ request }: { request: Request }) => {
  const formData = await request.formData();
  console.log(formData);
  return null;
}

export default function WorkstationsRoute() {
  const compartmentListForm = useFetcher();
  const { compartments, workstations } = useLoaderData()
  const isRefreshing =  compartmentListForm.state === "submitting";
  const workstationsNotFound = workstations && workstations.length === 0;

  if (compartmentListForm.submission) { 
    console.log(compartmentListForm.submission.formData.get("compartment"));
  }


  return (
    <div className="relative h-full p-10">
      <h1 className="font-display text-d-h3 text-black">Workstations</h1>
      <div className=" p-8">
        <SelectCompartment compartments={compartments} />
      </div>
      <div className="overflow-hidden rounded-lg border border-gray-200">
        {/* { isRefreshing ? (
          <div className="p-12 text-red-500">Loading</div>
        ) :
        ( */}
        { workstationsNotFound ?
          (<div className="p-12 text-red-500">No workstations found</div>) 
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
                  </Tr>
                </Thead>
                <Tbody>
                  {workstations.map((workstation) => (
                    <React.Fragment key={workstation.id}>
                      <Tr>
                        <Td className="border border-gray-100 py-2 px-4">
                        </Td>
                        <Td className="border border-gray-100 py-2 px-4 text-center">
                          {workstation.displayName}
                        </Td>
                        <Td className="border border-gray-100 py-2 px-4">
                          {workstation.region}
                        </Td>
                        <Td className="border border-gray-100 py-2 px-2">
                          {workstation.lifecycleState}
                        </Td>
                        <Td className="border border-gray-100 py-2 px-2">
                          {workstation.availabilityDomain}
                        </Td>
                      </Tr>
                    </React.Fragment>
                    ))}
                </Tbody>
              </Table>
            </TableContainer>
          )
        }
      {/* )} */}
      </div>
      <Outlet />
    </div>
  );
}



function SelectCompartment({ compartments }) {
  const compartmentListForm = useFetcher();
  if (compartmentListForm.submission) { 
    console.log(compartmentListForm.submission.formData.get("compartment"));
  }  
  // const checked = toggle.submission
  //   ? // use the optimistic version
  //     Boolean(toggle.submission.formData.get("complete"))
  //   : // use the normal version
  //     task.complete;

  // const { projectId, id } = task;
  return (
    <compartmentListForm.Form
      method="put"
      action={`/workstations`}
    >
      <Select
          size='md' 
          name="compartment"
          placeholder='Select option' 
          onChange={(e) => compartmentListForm.submit(e.target.form)}
          defaultValue={compartments[0].id} >
        {compartments.map((option) => (
            <option key={option.id} value={option.id} label={option.name}></option>
        ))}
        </Select>
    </compartmentListForm.Form>
  );
}
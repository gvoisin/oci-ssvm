import { useEffect, useRef } from "react";
import { Link, Outlet, useLoaderData, Form, useMatches, useFetcher } from "@remix-run/react";
import { ActionFunction, LoaderFunction, redirect } from "@remix-run/node"
import { json } from "@remix-run/node";
import { defaultCompartmentName } from "~/oci";

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


export async function loader({ request,params }: LoaderArgs) {
  console.log(params)
  if (params?.compartment === undefined ) {  
    console.log("tes")
    return redirect(`/workstations/${defaultCompartmentName}`)}
  return null;
}


export default function WorkstationsRoute() {

  return (
    <div>

      <Outlet />
    </div>
  );
}

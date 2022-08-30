import * as React from "react";
import { Link, Outlet, useLoaderData, useMatches } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node"
import { json } from "@remix-run/node";
import { getCompartments } from "~/oci";



export async function loader({ request }: LoaderArgs) {
  const compartments = await getCompartments({
    tenancy: ""
  });
  return { compartments };
}

export default function WorkstationsRoute() {
  const { compartments } = useLoaderData();
  const compartmentsNotFound = compartments.length === 0;

  return (
      <div className="relative h-full p-10">
          <h1 className="font-display text-d-h3 text-black">Compartments</h1>
          <div className="h-6" />
          <div className="overflow-hidden rounded-lg border border-gray-200">
          </div>
          <Outlet />
      </div>
  );
}
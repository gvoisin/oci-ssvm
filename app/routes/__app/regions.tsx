import * as React from "react";
import { Link, Outlet, useLoaderData, useMatches } from "@remix-run/react";
import type { LoaderFunction } from "@remix-run/node"
import { json } from "@remix-run/node";
import { provider,getRegions } from "~/oci";


export async function loader({ request }: LoaderArgs) {
  const tenancy = provider.getTenantId();
  console.log(tenancy);
  const regions = await getRegions({
    tenancy: tenancy || ""
  });
  return {regions};
}

export default function WorkstationsRoute() {
  const { regions } = useLoaderData();
  const regionsNotFound = regions.length === 0;

  return (
      <div className="relative h-full p-10">
          <h1 className="font-display text-d-h3 text-black">Regions</h1>
          <div className="h-6" />
          <div className="overflow-hidden rounded-lg border border-gray-200">
            { regionsNotFound ?
              (<div className="p-12 text-red-500">No regions found</div>) 
              : (
                <table className="w-full">
                  <thead className="border-b-2 border-gray-200">
                    <tr>
                      <th className="border border-gray-100 py-2 px-4"></th>
                      <th className="border border-gray-100 py-2 px-4">Code</th>
                      <th className="border border-gray-100 py-2 px-4">Name</th>
                      <th className="border border-gray-100 py-2 px-2">Status</th>
                      <th className="border border-gray-100 py-2 px-2">Home Region</th>
                    </tr>
                  </thead>
                  <tbody className="max-h-[100px]">
                    {regions.map((region) => (
                      <React.Fragment key={region.regionKey}>
                        <tr>
                          <td className="border border-gray-100 py-2 px-4">
                          </td>
                          <td className="border border-gray-100 py-2 px-4 text-center">
                            {region.regionKey}
                          </td>
                          <td className="border border-gray-100 py-2 px-4">
                            {region.regionName}
                          </td>
                          <td className="border border-gray-100 py-2 px-2">
                            {region.status}
                          </td>
                          <td className="border border-gray-100 py-2 px-2">
                            {region.isHomeRegion? "true": ""}
                          </td>
                        </tr>
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
            )}
          </div>
          <Outlet />
      </div>
  );
}
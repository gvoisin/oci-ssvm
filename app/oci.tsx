import * as identity from "oci-identity";
import * as os from "oci-objectstorage";
import * as common  from "oci-common";
import * as core from "oci-core";
import { json } from "@remix-run/node";


const configurationFilePath = "~/.oci/config";
const profile = "DEFAULT";

export const ENV_PRODUCTION = process.env.NODE_ENV === "production";

// export const provider: common.ConfigFileAuthenticationDetailsProvider = new common.ConfigFileAuthenticationDetailsProvider(
//     configurationFilePath,
//     profile
// );

export const provider = ociAuthenticationDetailsProvider(ENV_PRODUCTION);

function ociAuthenticationDetailsProvider(isProduction: boolean) {
    if ( !isProduction ) {
        const provider = new common.ConfigFileAuthenticationDetailsProvider(
                configurationFilePath,
                profile
        );
        
        return provider;
    } else {
        const provider = new common.InstancePrincipalsAuthenticationDetailsProviderBuilder().build();
        
        return provider;
    }
};
// process.env.NODE_ENV === "production"

export const identityClient = new identity.IdentityClient({ authenticationDetailsProvider: provider });

export const objectStorageClient: os.ObjectStorageClient = 
    new os.ObjectStorageClient({
    authenticationDetailsProvider: provider
});

export async function getAvailabilityDomain(): Promise<identity.models.AvailabilityDomain[]> {
    const tenancyId = provider.getTenantId();

    const request: identity.requests.ListAvailabilityDomainsRequest = {
      compartmentId: tenancyId
    };

    const response = await identityClient.listAvailabilityDomains(request);
    identityClient.region = common.Region.EU_FRANKFURT_1;
    return response.items;
}

export async function getCompartments({tenancy: string}): Promise<identity.models.Compartment[]> {
    const tenancyId = provider.getTenantId();

    const request: identity.requests.ListCompartmentsRequest = {
      compartmentId: tenancyId,
      compartmentIdInSubtree: true
    };

    const response = await identityClient.listCompartments(request);
    return response.items;
}

export async function getRegions({tenancy: string}): Promise<identity.models.RegionSubscription[]> {
    const tenancyId = provider.getTenantId();

    const request: identity.requests.ListRegionSubscriptionsRequest = {
      tenancyId: tenancyId,
    };

    const response = await identityClient.listRegionSubscriptions(request);
    return response.items;
}

export async function getWorkstations({tenancy: string}) {
    const client = new core.ComputeClient({ authenticationDetailsProvider: provider });

    try {
        const listInstancesRequest: core.requests.ListInstancesRequest = {
            compartmentId: "ocid1.compartment.oc1..aaaaaaaayoldhaolk5n6joepn6lp6sznrcfoeet6tohsotg3lmcg3ydujyya",
        };
        const listInstancesResponse = await client.listInstances(listInstancesRequest);
        return listInstancesResponse.items;
    } catch (error) {
        console.log("listInstances Failed with error  " + error);
    }
    return null;
}
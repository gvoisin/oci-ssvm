import * as identity from "oci-identity";
import * as os from "oci-objectstorage";
import * as common from "oci-common";
import * as core from "oci-core";
import { json } from "@remix-run/node";

const configurationFilePath = "~/.oci/config";
const profile = "DEFAULT";

export const ENV_PRODUCTION = process.env.NODE_ENV === "production";

// export const provider: common.ConfigFileAuthenticationDetailsProvider = new common.ConfigFileAuthenticationDetailsProvider(
//     configurationFilePath,
//     profile
// );

const defaultTenancyId: string = process.env.OCI_TENANTID;
export const defaultCompartmentId = process.env.OCI_COMPARTMENTID;
export const defaultCompartmentName = process.env.OCI_COMPARTMENTNAME;
export const defaultTagNs = process.env.OCI_TAG_NAMESPACE;
export const defaultTagName = process.env.OCI_TAG_NAME;
export const defaultTagNames = process.env.OCI_TAG_NAME?.split(",");
export const defaultTagValue = process.env.OCI_TAG_VALUE;
export const ociProvider = process.env.OCI_PROVIDER;

async function ociAuthenticationDetailsProvider(isProduction: boolean) {
  let provider = null;

  switch (ociProvider) {
    case "file": {
      provider = new common.ConfigFileAuthenticationDetailsProvider(
        configurationFilePath,
        profile
      );
      break;
    }
    case "resource": {
      provider = await common.ResourcePrincipalAuthenticationDetailsProvider.builder();
      break;
    }
    case "instance": {
      provider = new common.InstancePrincipalsAuthenticationDetailsProviderBuilder().build();
      break;
    }
  }
  return provider;
};

// process.env.NODE_ENV === "production"

export async function getAvailabilityDomain(): Promise<
  identity.models.AvailabilityDomain[]
> {
  const provider = await ociAuthenticationDetailsProvider(ENV_PRODUCTION);
  const identityClient = new identity.IdentityClient({
    authenticationDetailsProvider: provider,
  });

  const request: identity.requests.ListAvailabilityDomainsRequest = {
    compartmentId: defaultTenancyId,
  };

  const response = await identityClient.listAvailabilityDomains(request);
  identityClient.region = common.Region.EU_FRANKFURT_1;
  return response.items;
}

export async function getCompartments({
  tenancy: string,
}): Promise<identity.models.Compartment[]> {
  const provider = await ociAuthenticationDetailsProvider(ENV_PRODUCTION);
  const identityClient = new identity.IdentityClient({
    authenticationDetailsProvider: provider,
  });

  let request: identity.requests.ListCompartmentsRequest = {
    compartmentId: defaultTenancyId,
    compartmentIdInSubtree: true,
    lifecycleState: identity.models.Compartment.LifecycleState.Active,
    limit: 100,
    accessLevel:
      identity.requests.ListCompartmentsRequest.AccessLevel.Accessible,
  };

  const response = await identityClient.listCompartments(request);
  let compartments = response.items;

  if (response.opcNextPage) {
    let nextPage = response.opcNextPage;
    while (nextPage) {
        request = { ...request, page: nextPage};
        const responseNext = await identityClient.listCompartments(request);
        compartments = [...compartments, ...responseNext.items]
        nextPage = responseNext.opcNextPage;

    }

  }
  return compartments;
}

export async function getRegions({
  tenancy: string,
}): Promise<identity.models.RegionSubscription[]> {
  const provider = await ociAuthenticationDetailsProvider(ENV_PRODUCTION);
  const identityClient = new identity.IdentityClient({
    authenticationDetailsProvider: provider,
  });

  const request: identity.requests.ListRegionSubscriptionsRequest = {
    tenancyId: defaultTenancyId,
  };

  const response = await identityClient.listRegionSubscriptions(request);
  return response.items;
}

export async function getInstances(
  selectedCompartmentId: string = defaultCompartmentId
) {
  const provider = await ociAuthenticationDetailsProvider(ENV_PRODUCTION);
  const client = new core.ComputeClient({
    authenticationDetailsProvider: provider,
  });
  try {
    const listInstancesRequest: core.requests.ListInstancesRequest = {
      compartmentId: selectedCompartmentId,
    };
    const listInstancesResponse = await client.listInstances(
      listInstancesRequest
    );
    return listInstancesResponse.items;
  } catch (error) {
    console.log("listInstances Failed with error  " + error);
    return [];
  }
  return null;
}

export async function getInstance(instanceId: string) {
  const provider = await ociAuthenticationDetailsProvider(ENV_PRODUCTION);
  const client = new core.ComputeClient({
    authenticationDetailsProvider: provider,
  });
  try {
    const listInstancesRequest: core.requests.GetInstanceRequest = {
      instanceId: instanceId,
    };
    const getInstancesResponse = await client.getInstance(listInstancesRequest);
    return getInstancesResponse;
  } catch (error) {
    console.log("getInstances Failed with error  " + error);
  }
  return null;
}

export async function getInstancePrimaryPrivateIp(instance) {
  const provider = await ociAuthenticationDetailsProvider(ENV_PRODUCTION);
  const client = new core.ComputeClient({
    authenticationDetailsProvider: provider,
  });
  const networkClient = new core.VirtualNetworkClient({
    authenticationDetailsProvider: provider,
  });
  try {
    const request: core.requests.ListVnicAttachmentsRequest = {
      instanceId: instance.id,
      compartmentId: instance.compartmentId,
    };
    const listVnicAttachmentsResponse = await client.listVnicAttachments(
      request
    );
    //        console.log(listVnicAttachmentsResponse.items);

    const requestVnic: core.requests.GetVnicRequest = {
      vnicId: listVnicAttachmentsResponse.items[0].vnicId,
    };
    const getVnicResponse = await networkClient.getVnic(requestVnic);
    const instancePrimaryIp = getVnicResponse.vnic.isPrimary
      ? getVnicResponse.vnic.privateIp
      : "";

    return instancePrimaryIp;
  } catch (error) {
    console.log("getInstances Failed with error  " + error);
  }
  return null;
}

export async function actionInstance(instanceId, action) {
  const provider = await ociAuthenticationDetailsProvider(ENV_PRODUCTION);
  const client = new core.ComputeClient({
    authenticationDetailsProvider: provider,
  });

  try {
    const request: core.requests.InstanceActionRequest = {
      action: action,
      instanceId: instanceId,
    };
    const actionInstanceResponse = await client.instanceAction(request);
    return null;
  } catch (error) {
    console.log("Start Instance Failed with error  " + error);
  }
  return null;
}

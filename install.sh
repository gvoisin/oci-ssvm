# This is an auto install script for Oracle Linux 9.0
# It will install, configure and automatically run the aoci-ssvm web application  using Instance Principal permission
# So ensure you have configured a dynamic group for this instance and that that dynamic group
# has a policy to manage all resources in your tenancy.

# Set to your time zone for correct time
sudo timedatectl set-timezone Europe/Amsterdam

# Install needed components and configure crontab with correct schedule
sudo yum -y install git nodejs npm python3-pip
sudo pip3 install oci oci-cli

# Open Firewall port 3000
sudo firewall-cmd --add-port=3000/tcp --permanent
sudo firewall-cmd --reload

git clone https://github.com/gvoisin/oci-ssvm.git
cd oci-ssvm

# Install Node Modules
npm i

# Install oci-sdk typescript fixes for Remix
cp fix/helper.js node_modules/oci-common/lib
cp fix/url-based-x509-certificate-supplier.js node_modules/oci-common/lib/auth/

if [[ ! -x "start.sh" ]]
then
  # Ask for default parameters to create ENV variables
  echo -n "Enter Your Tenancy OCID: "
  read tenancyId
  echo ""
  testTenancyId=`oci iam tenancy get --auth instance_principal --tenancy-id $tenancyId > /dev/null 2>&1; echo $?`
  [ ! "$testTenancyId" -eq  "0" ] && echo "Wrong Tenancy ID; aborting install." && exit 1

  echo -n "Enter Your default Compartment OCID: "
  read compartmentId
  echo ""
  testCompartmentId=`oci iam compartment get --auth instance_principal --compartment-id $compartmentId > /dev/null 2>&1; echo $?`
  [ ! "$testCompartmentId" -eq  "0" ] && echo "Wrong Compartment ID; aborting install." && exit 1

  compartmentName=`oci iam compartment get --auth instance_principal --compartment-id $compartmentId |jq '.data.name' | cut -d\" -f2`

  echo "Default Compartment Name is : $compartmentName"

  echo "Creating start.sh file ..."
  echo "export DEFAULT_COMPARTMENTID=$compartmentId" > start.sh
  echo "export DEFAULT_COMPARTMENTNAME=$compartmentName" >> start.sh
  echo "export DEFAULT_TENANTID=$tenancyId" >> start.sh
  echo "export TAG_NAMESPACE=vmtypes" >> start.sh
  echo "export TAG_NAME=dev" >> start.sh
  echo "export TAG_VALUE=workstation" >> start.sh
  echo "" >> start.sh
  chmod +x start.sh
  echo "npm  run start" >> start.sh
fi

# Build the project
echo "🏎 -- Building the application ..."
npm run build

# start the App
echo "🏎 -- Starting the application ..."
nohup  ./start.sh > start.log  &
tail -f start.log

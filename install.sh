#!/usr/bin/env bash
# +==========================================================================================+
# |   
# |  
# | 
# +==========================================================================================+
# |
# | FILENAME
# |  install.sh
# |
# | DESCRIPTION
# |  This is an auto install script for Oracle Linux 9.0
# |  It will install, configure and automatically run the aoci-ssvm web application  
# |  The application uses Instance Principal permission:
# |    => ensure you have configured a dynamic group for this instance and that dynamic group
# |       has a policy to manage all resources in your tenancy.
# |
# | Command:
# |  ./install.sh
# |
# | HISTORY
# |     DATE       : Author                   : Description
# |     09/02/2022 : Guenael Voisin           : Initial
# +==========================================================================================+

if [[ ${DEBUG-} =~ ^1|yes|true$ ]]; then
    set -o xtrace       # Trace the execution of the script (debug)
fi

#----------------------------------------------------------------------
#     Variables
#----------------------------------------------------------------------

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROGRAM=`basename $0`
ARGS=$*
DATEFORMAT=`date +'%Y%m%d%H%M%S'`

REQUIRED_YUM_PACKAGES="git nodejs npm python3-pip"
REQUIRED_PIP_PACKAGES="oci oci-cli"

# Log file name.
LOG="${SCRIPT_DIR}/log/install.out"

trap '{ echo "Interrupt received! - Exiting" ; stty echo ; exit 1; }' SIGHUP SIGINT SIGTERM


#----------------------------------------------------------------------
#     Helper functions
#----------------------------------------------------------------------

function log {
    #echo -e "\t\t\t"$1 | tee -a ${LOG}
    echo -e $1 | tee -a ${LOG}
}

function log2() {
  local date_format="${BASHLOG_DATE_FORMAT:-+%F %T}";
  local date="$(date "${date_format}")";
  local date_s="$(date "+%s")";

  local file="${BASHLOG_FILE:-1}";
  local file_path="${LOG:-/tmp/$(basename "${0}").log}";

  local pid="${$}";

  local level="${1}";
  local upper="$(echo "${level}" | awk '{print toupper($0)}')";
  local debug_level="${DEBUG:-0}";

  shift 1;

  local line="${@}";

  # RFC 5424
  #
  # Numerical         Severity
  #   Code
  #
  #    0       Emergency: system is unusable
  #    1       Alert: action must be taken immediately
  #    2       Critical: critical conditions
  #    3       Error: error conditions
  #    4       Warning: warning conditions
  #    5       Notice: normal but significant condition
  #    6       Informational: informational messages
  #    7       Debug: debug-level messages

  local -A severities;
  severities['DEBUG']=7;
  severities['INFO']=6;
  severities['NOTICE']=5; # Unused
  severities['WARN']=4;
  severities['ERROR']=3;
  severities['CRIT']=2;   # Unused
  severities['ALERT']=1;  # Unused
  severities['EMERG']=0;  # Unused

  local severity="${severities[${upper}]:-3}"

  if [ "${debug_level}" -gt 0 ] || [ "${severity}" -lt 7 ]; then

    if [ "${file}" -eq 1 ]; then
      local file_line="${date} [${upper}] ${line}";
      echo -e "${file_line}" >> "${file_path}" \
        || _log_exception "echo -e \"${file_line}\" >> \"${file_path}\"";
    fi;
  fi;

  local -A colours;
  colours['DEBUG']='\033[34m'  # Blue
  colours['INFO']='\033[32m'   # Green
  colours['NOTICE']=''         # Unused
  colours['WARN']='\033[33m'   # Yellow
  colours['ERROR']='\033[31m'  # Red
  colours['CRIT']=''           # Unused
  colours['ALERT']=''          # Unused
  colours['EMERG']=''          # Unused
  colours['DEFAULT']='\033[0m' # Default

  local norm="${colours['DEFAULT']}";
  local colour="${colours[${upper}]:-\033[31m}";

  local std_line="${colour}${date} [${upper}] ${line}${norm}";

  # Standard Output (Pretty)
  case "${level}" in
    'header')
      printf %"80"s |tr " " "-";
      echo ""
      echo  "---- ${line}";
      printf %"80"s |tr " " "-";
      echo ""
      ;;
    'info'|'warn')
      echo -e "${std_line}";
      ;;
    'debug')
      if [ "${debug_level}" -gt 0 ]; then
        echo -e "${std_line}";
      fi;
      ;;
    'error')
      echo -e "${std_line}" >&2;
      if [ "${debug_level}" -gt 0 ]; then
        echo -e "Here's a shell to debug with. 'exit 0' to continue. Other exit codes will abort - parent shell will terminate.";
        bash || exit "${?}";
      fi;
      ;;
    *)
      log 'error' "Undefined log level trying to log: ${@}";
      ;;
  esac
}

function initialize_logger {
    tempargs=$ARGS


    if [[ ! -d ${SCRIPT_DIR}/log ]]; then
      mkdir -p -m755 ${SCRIPT_DIR}/log
    fi
    touch $LOG
}

function yum_install {
    log2 info "Installing $1 from yum repo ..."
    sudo yum install -y $1 >> $LOG 2>&1
    if [[ $? -ne 0 ]]; then
      log2 error "ERROR: yum install of $1 failed."
      exit_program
    fi
}

function pip_install {
    log2 info "Installing $1 from Python pip repo ..."
    sudo pip3 install $1 >> $LOG 2>&1
    if [[ $? -ne 0 ]]; then
      log2 error "ERROR: pip install of $1 failed."
      exit_program
    fi
}

function add_firewall_port { 
    if [[ $# -lt 1 ]]; then
        log2 error 'Missing required port number to add_firewall_port()!' 
	exit_program
    fi
    [[ $1 != ?(-)+([0-9]) ]] && log '$1 is not a valid Port Number'
    myport=$1
    log2 info "Opening Firewall Port $1"
    sudo firewall-cmd --add-port=$1/tcp --permanent >> $LOG 
    if [[ $? -ne 0 ]]; then
      log2 error "ERROR: Opening Firewall Port $1 failed."
      exit_program
    fi
    sudo firewall-cmd --reload >> $LOG 
}

function exit_program {
    log2 error "Exiting."
    exit 1
}


function check_auth_principals {
    # ToDo: command is valid even with incorrect policies - need to replace with another one
    log2 info "Validating Instance Principals authentication ..."
    testPrincipals=`oci os ns get --auth instance_principal > /dev/null 2>&1; echo $?`
    if [ ! "$testPrincipals" -eq  "0" ]
    then 
      log2 error "Error while using OCI CLI"
      log2 error "Check if you have configured the Dynamic Group & Policies correctly for this VM"
      exit_program
    fi 
    log2 info "Instance Principals authentication validated"

}

function get_tenancy {
  while true; do
    echo -n "Enter Your Tenancy OCID: "
    read tenancyId
    echo ""
    log2 info "Validating Tenancy Id  $tenancyId ..."
    testTenancyId=`oci iam tenancy get --auth instance_principal --tenancy-id $tenancyId > /dev/null 2>&1; echo $?`
    if [ ! "$testTenancyId" -eq  "0" ]
    then 
      log2 error "Wrong Tenancy Id: $tenancyId"
      read  -p "Do you wish to continue [Y/N]?" yn
      case $yn in
         [Yy]* ) ;;
         * ) log2 info "Existing install"; exit_program;
      esac
    else
      log2 info "Tenancy validated"
      break;
    fi 
  done
}

function get_compartment {
  while true; do

    #  echo -n "Enter Your default Compartment OCID: "
    #read compartmentId
    #echo ""
    #testCompartmentId=`oci iam compartment get --auth instance_principal --compartment-id $compartmentId > /dev/null 2>&1; echo $?`
    # compartmentName=`oci iam compartment get --auth instance_principal --compartment-id $tenancyId |jq '.data.name' | cut -d\" -f2`
    #[ ! "$testCompartmentId" -eq  "0" ] && echo "Wrong Compartment ID; aborting install." && exit 1

    echo -n "Enter Your default Compartment Name: "
    read compartmentName
    echo ""
    
    export compartmentName
    log2 info "Validating Compartment Name $compartmentName ..."
    compartmentId=`oci iam compartment list --auth instance_principal --compartment-id $tenancyId --compartment-id-in-subtree true --all|jq '.data[] | select(.name==env.compartmentName)| .id'  | cut -d\" -f2`
    if [ -n "$compartmentId" ]; then
      log2 info "Compartment Name validated"
      log2 info "Compartment ID is $compartmentId"
      break;
    else
      log2 error "Wrong Compartment Name: $compartmentName"
      read  -p "Do you wish to continue [Y/N]?" yn
      case $yn in
         [Yy]* ) ;;
         * ) log2 info "Existing install"; exit_program;
      esac
    fi 
  done
}


function create_startup {
  log2 info "Creating start.sh file ..."

  log2 header "--- OCI configuration:"
  log2 info " OCI_COMPARTMENTID=$compartmentId"
  log2 info " OCI_COMPARTMENTNAME=$compartmentName"
  log2 info " OCI_TENANTID=$tenancyId"
  log2 info " OCI_TAG_NAMESPACE=vmtypes"
  log2 info " OCI_TAG_NAME=dev"
  log2 info " OCI_TAG_VALUE=workstation"
  log2 info " OCI_PROVIDER=instance"
  log2 info ""

  echo "export OCI_COMPARTMENTID=$compartmentId" > start.sh
  echo "export OCI_COMPARTMENTNAME=$compartmentName" >> start.sh
  echo "export OCI_TENANTID=$tenancyId" >> start.sh
  echo "export OCI_TAG_NAMESPACE=vmtypes" >> start.sh
  echo "export OCI_TAG_NAME=dev" >> start.sh
  echo "export OCI_TAG_VALUE=workstation" >> start.sh
  echo "export OCI_PROVIDER=instance" >> start.sh
  echo "" >> start.sh
  chmod +x start.sh
  echo "npm  run start" >> start.sh
}

#################################################################################
#                          Main starts here.
#################################################################################

initialize_logger

log2 header "Start Install"

# Set to your time zone for correct time
sudo timedatectl set-timezone Europe/Amsterdam

# Install needed components
for myyum in $REQUIRED_YUM_PACKAGES
do
  yum_install ${myyum}
done

for mypip in $REQUIRED_PIP_PACKAGES
do
  pip_install ${mypip}
done

# Open Firewall port 3000
add_firewall_port 3000

if [[ ! -d "oci-ssvm" ]]
then 
  log2 info "Cloning oci-ssvm from Github ..."
  git clone https://github.com/gvoisin/oci-ssvm.git >>$LOG 2>&1
else
  log " oci-ssvm already installed from Github; continuing the install ..."
fi
cd oci-ssvm

# Install Node Modules
log2 info "Installing Node modules for the application ..."
npm i >>$LOG 2>&1

# Install oci-sdk typescript fixes for Remix
log2 info "Installing required Fix for OCI Typescript SDK to work with Remix ..."
cp fix/helper.js node_modules/oci-common/lib
cp fix/url-based-x509-certificate-supplier.js node_modules/oci-common/lib/auth/


if [[ ! -x "start.sh" ]]
then
  # Ask for default parameters to create ENV variables
  log2 header "configure the startup script with your OCI settings:"

  check_auth_principals

  get_tenancy

  get_compartment

  create_startup
fi

# Build the project
log2 header "🏎 -- Building the application ..."
npm run build >> $LOG 

# start the App
log2 header "🏎 -- Starting the application ..."
nohup  ./start.sh > start.log  &
tail -f oci-ssvm/start.log

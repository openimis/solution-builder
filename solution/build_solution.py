import json
import os
import yaml
import uuid
from datetime import datetime
import getopt
import gettext
import sys

def load_json(file_path):
    """Load JSON from a file if it exists, otherwise return None."""
    with open(file_path, 'r') as file:
        return json.load(file)


def merge_solutions(solution_file, permission_map, path=None, modules=None, menu_dict=None, role_dict=None):
    if modules is None:
        modules = set()
    if  menu_dict is None:
        menu_dict = {}
    if  role_dict is None:
        role_dict = {}
    if path is not None:
        bundle_file = os.path.join(path, bundle_file)
    directory_path = os.path.dirname(solution_file)
    solution = load_json(solution_file)
    # load direct modules
    for x in (solution['dependency'] if 'dependency' in solution  else []):
        merge_solutions( get_absolute_path(x, directory_path ),permission_map, modules=modules, menu_dict=menu_dict, role_dict=role_dict)
    for x in (solution['modules'] if 'modules' in solution  else []):
        merge_solutions( get_absolute_path(x, directory_path ),permission_map, modules=modules, menu_dict=menu_dict, role_dict=role_dict)
    modules.update(set( get_absolute_path(x, directory_path ) for x in ( solution['modules'] if 'modules' in solution  else [])))
    merge_roles_data(( solution['roles'] if 'roles' in solution  else []),permission_map, role_dict)
    merge_menus_data(( solution['menus'] if 'menus' in solution  else []), menu_dict)
    return modules, menu_dict, role_dict



def sort_menus(menu_dict):
    for menu in menu_dict.values():
            menu["submenus"] = sorted(menu["submenus"], key=lambda submenu: submenu.get("position", float("inf")))

    return sorted(menu_dict.values(), key=lambda menu: menu.get("position", float("inf")))


def merge_menus(modules,  menu_dict=None):
    """Merge and sort menus from multiple JSON files, ensuring submenus are merged correctly."""
    if  menu_dict is None:
        menu_dict = {}

    for module_file in modules:
        module_data = load_json(module_file)
        merge_menus_data(module_data['menus'] if 'menus' in module_data else [] ,  menu_dict)
    return menu_dict
        
def merge_menus_data(module_data,  menu_dict):

        for menu in module_data:
            menu_id = menu["id"]
            # overwrite existing values
            menu_dict[menu_id] = {
                "position": menu["position"],
                "id": menu["id"],
                "name": menu["name"],
                "icon": menu["icon"],
                "description": menu["description"],
                "submenus": []
            }

            if "submenus" in menu:
                menu_dict[menu_id]["submenus"].extend(menu["submenus"])



def merge_roles(modules, permission_map, roles_dict):
    """Merge roles from multiple modules, only including roles with valid permissions."""

    for module_file in modules:
        module_data = load_json(F"modules/{module_file}")
        if not module_data or "roles" not in module_data:
            continue
        roles_dict = merge_roles_data(module_data["roles"] if 'roles' in module_data else [], permission_map, roles_dict)
        
    return roles_dict
       
def sort_roles(roles_dict): 
    return [
            {
                "roleName": role_data["roleName"],
                "code": role_data["code"],
                "permissions": sorted(role_data["permissions"], key=lambda x: x["name"])
            }
            for role_data in roles_dict.values()
        ]


def merge_roles_data(module_data, permission_map, roles_dict):
    for role in module_data:
        role_code = role["code"]
        permissions = role.get("permissions", [])

        mapped_permissions = [
            {"name": permission, "code": permission_map.get(permission, permission)}
            for permission in permissions
            if permission in permission_map
        ]

        if not mapped_permissions:
            continue

        if role_code in roles_dict:
            roles_dict[role_code]["permissions"].extend(mapped_permissions)
        else:
            roles_dict[role_code] = {
                "roleName": role["roleName"],
                "code": role_code,
                "permissions": mapped_permissions
            }
        return roles_dict

    

def process_packages(modules):
    """Process frontend and backend packages from module files."""
    fe_packages = []
    be_packages = []

    for module_file in modules:
        module_data = load_json(module_file)
        if not module_data:
            continue

        fe_packages.extend(module_data.get("fe-packages", []))
        be_packages.extend(module_data.get("be-packages", []))

    return sorted(fe_packages, key=lambda x: x.get("name", "")), sorted(be_packages, key=lambda x: x.get("name", ""))


def process_services(service_file):
    """Process service dependencies from service.json and generate YAML output."""

    service_data = load_json(service_file)

    if not service_data:
        print("No service.json found. Skipping service processing.")
        return None

    services_output = []

    if isinstance(service_data, list):
        for service in service_data:
            services_output.append({
                "path": service.get("path", ""),
                "env_file": service.get("env_file", [])
            })
    else:
        services_output.append({
            "path": service_data.get("path", ""),
            "env_file": service_data.get("env_file", [])
        })

    return services_output


def save_services_yaml(services):
    """Save services as YAML format in generated-services.yml with correct indentation."""
    if not services:
        return

    yaml_output = {"include": services}

    class IndentedDumper(yaml.Dumper):
        """Custom YAML Dumper to force proper indentation."""
        def increase_indent(self, flow=False, indentless=False):
            return super(IndentedDumper, self).increase_indent(flow, False)

    with open("compose.yml", "w") as file:
        yaml.dump(
            yaml_output, file,
            Dumper=IndentedDumper,
            default_flow_style=False,
            sort_keys=False,
            allow_unicode=True,
            indent=2
        )

    print("Generated services written to compose.yml")


def generate_role_fixtures(generated_roles_file, system_roles_file):
    """Generate role and role-right fixtures using natural keys, avoiding duplicates."""


    generated_roles = load_json(generated_roles_file)
    system_roles_data = load_json(system_roles_file)

    if not generated_roles or not system_roles_data:
        print("Missing required files. Skipping role fixture generation.")
        return

    existing_roles = {role["RoleName"] for role in system_roles_data.get("tblRole", [])}

    role_fixtures = []
    role_right_fixtures = []
    validity_from = datetime.utcnow().isoformat() + "Z"

    for role_entry in generated_roles.get("roles", []):
        role_name = role_entry["roleName"]

        if role_name not in existing_roles:
            role_uuid = str(uuid.uuid4())
            role_fixtures.append({
                "model": "core.role",
                "fields": {
                    "uuid": role_uuid,
                    "name": role_name,
                    "alt_language": None,
                    "is_system": 0,
                    "is_blocked": False,
                    "audit_user_id": None,
                    "validity_from": validity_from,
                    "validity_to": None,
                    "legacy_id": None
                }
            })
            for permission in role_entry["permissions"]:
                role_right_fixtures.append({
                    "model": "core.roleright",
                    "fields": {
                        "validity_from": validity_from,
                        "validity_to": None,
                        "legacy_id": None,
                        "right_id": permission["code"],
                        "audit_user_id": None,
                        "role": [role_name]
                    }
                })

    os.makedirs("fixtures/core", exist_ok=True)

    if role_fixtures:
        with open("fixtures/core/roles.json", "w", encoding="utf-8") as file:
            json.dump(role_fixtures, file, indent=2)

    if role_right_fixtures:
        with open("fixtures/core/roles-right.json", "w", encoding="utf-8") as file:
            json.dump(role_right_fixtures, file, indent=2)

    print("Generated roles and roles-right fixtures successfully.")


def main(solution_file):
    #always loading
    directory_path = os.path.dirname(solution_file)
    file_path = os.path.dirname(__file__)

    permissions_map_file = get_absolute_path('permissions_map.json', directory_path )
    permissions_map = load_json(permissions_map_file)
    resolved_modules , menus_dict, roles_dict = merge_solutions(solution_file, permissions_map, modules = set([os.path.join(file_path,"modules/core.json")]))
    menus = sort_menus(menus_dict)
    roles = sort_roles(roles_dict)
    
    with open('generated-menu.json', 'w') as file:
        json.dump({"menus": menus}, file, indent=2)
    print("Generated menus written to generated-menu.json")

    roles_output_file = 'generated-roles.json'
    with open(roles_output_file, 'w') as file:
        json.dump({"roles": roles}, file, indent=2)
    print(f"Generated roles written to {roles_output_file}")

    fe_packages, be_packages = process_packages(resolved_modules)
    with open('fe-openimis.json', 'w') as file:
        json.dump({"packages": fe_packages}, file, indent=2)
    print("Generated frontend packages written to fe-openimis.json")

    with open('be-openimis.json', 'w') as file:
        json.dump({"packages": be_packages}, file, indent=2)
    print("Generated backend packages written to be-openimis.json")
    service_file = os.path.join(file_path,'service.json')
    services = process_services(service_file)
    save_services_yaml(services)
    
    generated_roles_file = os.path.join(os.getcwd(),"generated-roles.json")
    system_roles_file = os.path.join(file_path,"roles-data.json")
    generate_role_fixtures(generated_roles_file, system_roles_file)

    print("Processing completed.")
    
def get_absolute_path(file_path, path=None):
    """Convert a relative path to absolute path using script location."""
    # Check if the path is already absolute
    if os.path.isabs(file_path):
        return file_path
    
    # Get the directory where the script is located
    if not path:
        path = os.path.dirname(os.path.abspath(__file__))
    
    # Join script directory with relative path
    return os.path.join(path, file_path)

def print_help():
    print(
        "-f / --file Solution definition that need to be loaded"
    )
    print("-h / --help print that menu")


if __name__ == "__main__":
    solution_file = None
    try:
        opts, args = getopt.getopt(
            sys.argv[1:], "f:", ["file="]
        )
    except getopt.GetoptError:
        print_help()
        sys.exit(1)
    for opt, arg in opts:
        if opt in ("-h", "--help"):
            print_help()
            sys.exit()
        if opt in ("-f", "--file"):
            solution_file = arg
    if solution_file is None:
        solution_file='./solution.json'

    main(solution_file=get_absolute_path(solution_file))

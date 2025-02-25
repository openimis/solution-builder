import json
import os
import yaml
import uuid
from datetime import datetime


def load_json(file_path):
    """Load JSON from a file if it exists, otherwise return None."""
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return None
    with open(file_path, 'r') as file:
        return json.load(file)


def resolve_modules(solution_modules):
    """Recursively resolve all modules, including dependencies."""
    all_modules = set(solution_modules)
    queue = list(solution_modules)

    while queue:
        bundle_file = queue.pop(0)
        bundle_data = load_json(F"bundles/{bundle_file}")
        if not bundle_data:
            continue

        for module in bundle_data.get("modules", []):
            if module not in all_modules:
                all_modules.add(module)
                queue.append(module)

        for dependency in bundle_data.get("dependency", []):
            if dependency not in all_modules:
                all_modules.add(dependency)
                queue.append(dependency)

    return list(all_modules)


def merge_menus(modules):
    """Merge and sort menus from multiple JSON files, ensuring submenus are merged correctly."""
    menu_dict = {}

    for module_file in modules:
        module_data = load_json(F"modules/{module_file}")
        if module_data and "menus" in module_data:
            for menu in module_data["menus"]:
                menu_id = menu["id"]

                if menu_id not in menu_dict:
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

    for menu in menu_dict.values():
        menu["submenus"] = sorted(menu["submenus"], key=lambda submenu: submenu.get("position", float("inf")))

    return sorted(menu_dict.values(), key=lambda menu: menu.get("position", float("inf")))


def merge_roles(modules, permission_map):
    """Merge roles from multiple modules, only including roles with valid permissions."""
    merged_roles = {}

    for module_file in modules:
        module_data = load_json(F"modules/{module_file}")
        if not module_data or "roles" not in module_data:
            continue

        for role in module_data["roles"]:
            role_code = role["code"]
            permissions = role.get("permissions", [])

            mapped_permissions = [
                {"name": permission, "code": permission_map.get(permission, permission)}
                for permission in permissions
                if permission in permission_map
            ]

            if not mapped_permissions:
                continue

            if role_code in merged_roles:
                merged_roles[role_code]["permissions"].extend(mapped_permissions)
            else:
                merged_roles[role_code] = {
                    "roleName": role["roleName"],
                    "code": role_code,
                    "permissions": mapped_permissions
                }

    return [
        {
            "roleName": role_data["roleName"],
            "code": role_data["code"],
            "permissions": sorted(role_data["permissions"], key=lambda x: x["name"])
        }
        for role_data in merged_roles.values()
    ]


def process_packages(modules):
    """Process frontend and backend packages from module files."""
    fe_packages = []
    be_packages = []

    for module_file in modules:
        module_data = load_json(F"modules/{module_file}")
        if not module_data:
            continue

        fe_packages.extend(module_data.get("fe-packages", []))
        be_packages.extend(module_data.get("be-packages", []))

    return sorted(fe_packages, key=lambda x: x.get("name", "")), sorted(be_packages, key=lambda x: x.get("name", ""))


def process_services():
    """Process service dependencies from service.json and generate YAML output."""
    service_file = 'service.json'
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


def generate_role_fixtures():
    """Generate role and role-right fixtures using natural keys, avoiding duplicates."""
    generated_roles_file = "generated-roles.json"
    system_roles_file = "roles-data.json"

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


def generate_menu_fixtures():
    """Generate menu configuration fixture using generated-menu.json output."""
    menu_file = "generated-menu.json"
    menu_data = load_json(menu_file)

    if not menu_data or "menus" not in menu_data:
        print("Error: generated-menu.json is missing or invalid.")
        return

    menu_config_uuid = str(uuid.uuid4())
    menu_fixtures = [
        {
            "model": "core.moduleconfiguration",
            "fields": {
                "id": menu_config_uuid,
                "module": "fe-core",
                "version": "1",
                "config": json.dumps(menu_data, indent=2),
                "is_disabled_until": None,
                "is_exposed": True,
                "layer": "fe"
            }
        }
    ]

    os.makedirs("fixtures/core", exist_ok=True)
    with open("fixtures/core/menu-config.json", "w", encoding="utf-8") as file:
        json.dump(menu_fixtures, file, indent=2)

    print("Generated menu configuration fixture written to fixtures/core/menu-config.json")


def main():
    solution_file = 'solution.json'
    solution_data = load_json(solution_file)

    if not solution_data:
        print("Error: solution.json file is missing or invalid.")
        return

    resolved_modules = resolve_modules(solution_data.get('modules', []))

    menus = merge_menus(resolved_modules)
    with open('generated-menu.json', 'w') as file:
        json.dump({"menus": menus}, file, indent=2)
    print("Generated menus written to generated-menu.json")

    permissions_map_file = 'permissions_map.json'
    permissions_map = load_json(permissions_map_file)
    roles = merge_roles(resolved_modules, permissions_map)
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

    services = process_services()
    save_services_yaml(services)

    generate_role_fixtures()
    generate_menu_fixtures()

    print("Processing completed.")


if __name__ == "__main__":
    main()

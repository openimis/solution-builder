import json
import os


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
        bundle_data = load_json(bundle_file)
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
        module_data = load_json(module_file)
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
        module_data = load_json(module_file)
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
            "permissions": sorted(role_data["permissions"], key=lambda x: x["name"])  # Sort by permission name
        }
        for role_data in merged_roles.values()
    ]


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


if __name__ == "__main__":
    main()

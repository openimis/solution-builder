import json
import os


def load_json(file_path):
    """Load JSON from a file if it exists, otherwise return None."""
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return None
    with open(file_path, 'r') as file:
        return json.load(file)


def merge_menus(modules):
    """Merge and sort menus from multiple JSON files."""
    combined_menus = []

    for module_file in modules:
        module_data = load_json(module_file)
        if module_data and 'menus' in module_data:
            combined_menus.extend(module_data['menus'])

    combined_menus.sort(key=lambda menu: menu['position'])
    for menu in combined_menus:
        if 'submenus' in menu:
            menu['submenus'].sort(key=lambda submenu: submenu['position'])

    return combined_menus


def _convert_to_pascal_case(name):
    """Convert snake_case to PascalCase."""
    return ''.join(word.capitalize() for word in name.split('_'))


def _process_package(pkg, package_type):
    """
    Process a single package based on its type and return the transformed package.

    :param pkg: Dictionary containing package data.
    :param package_type: Type of package ('fe' or 'be').
    :return: Transformed package dictionary or None if type is unsupported.
    """
    if not isinstance(pkg, dict) or "type" not in pkg:
        return None

    def clean_name(name, package_type):
        if package_type == "fe":
            if name.startswith("openimis-fe-"):
                return name[len("openimis-fe-"):]
        elif package_type == "be":
            # For other backend packages, remove 'openimis-be-' prefix and '_py' suffix
            if name.startswith("openimis-be-") and name.endswith("_py"):
                return name[len("openimis-be-"):-3]  # Remove 'openimis-be-' and '_py'
        return name

    if package_type == "fe":
        if pkg["type"] == "npm":
            cleaned_name = clean_name(pkg["name"], "fe").replace("_js", "")
            pascal_name = _convert_to_pascal_case(cleaned_name)
            return {
                "name": f"{pascal_name}Module",
                "npm": f"@openimis/fe-{cleaned_name}@>=v{pkg['version'].lstrip('v')}"
            }
        elif pkg["type"] == "github":
            cleaned_name = clean_name(pkg["name"], "fe").replace("_js", "")
            pascal_name = _convert_to_pascal_case(cleaned_name)
            branch_or_version = pkg.get('version', 'develop')
            return {
                "name": f"{pascal_name}Module",
                "npm": f"@openimis/fe-{cleaned_name}@https://github.com/openimis/openimis-fe-{cleaned_name}_js#{branch_or_version}"
            }

    elif package_type == "be":
        if pkg["type"] == "pip":
            cleaned_name = clean_name(pkg["name"], "be")
            return {
                "name": cleaned_name,
                "pip": f"{pkg['name'][:-3]}=={pkg['version']}"
            }
        elif pkg["type"] == "github":
            cleaned_name = clean_name(pkg["name"], "be")
            branch_or_version = pkg.get('version', 'develop')
            return {
                "name": cleaned_name,
                "pip": f"git+https://github.com/openimis/openimis-be-{cleaned_name}_py.git@{branch_or_version}#egg=openimis-be-{cleaned_name}"
            }

    return None


def process_packages(modules):
    """Process fe-packages and be-packages from module files."""
    fe_packages = []
    be_packages = []

    for module_file in modules:
        module_data = load_json(module_file)
        if not module_data:
            continue

        for pkg in module_data.get("fe-packages", []):
            processed_pkg = _process_package(pkg, "fe")
            if processed_pkg:
                fe_packages.append(processed_pkg)

        for pkg in module_data.get("be-packages", []):
            processed_pkg = _process_package(pkg, "be")
            if processed_pkg:
                be_packages.append(processed_pkg)

    fe_packages = sorted({frozenset(pkg.items()): pkg for pkg in fe_packages}.values(), key=lambda x: x["name"])
    be_packages = sorted({frozenset(pkg.items()): pkg for pkg in be_packages}.values(), key=lambda x: x["name"])

    return fe_packages, be_packages


def merge_roles(modules):
    """Merge roles from multiple modules while ensuring unique permissions."""
    merged_roles = {}
    for module_file in modules:
        module_data = load_json(module_file)
        if not module_data or "roles" not in module_data:
            continue
        for role in module_data["roles"]:
            role_name = role["roleName"]
            role_id = role["roleId"]
            permissions = set(role.get("permissions", []))

            if role_name in merged_roles:
                merged_roles[role_name]["permissions"].update(permissions)
            else:
                merged_roles[role_name] = {
                    "roleName": role_name,
                    "roleId": role_id,
                    "permissions": permissions
                }
    return [
        {
            "roleName": role_data["roleName"],
            "roleId": role_data["roleId"],
            "permissions": sorted(role_data["permissions"])
        }
        for role_data in merged_roles.values()
    ]


def main():
    solution_file = 'solution.json'
    solution_data = load_json(solution_file)

    if not solution_data:
        print("solution.json file is missing or invalid.")
        return

    modules = solution_data.get('modules', [])
    menus = merge_menus(modules)

    output_data = {
        'menus': menus
    }

    output_file = 'generated-menu.json'
    with open(output_file, 'w') as file:
        json.dump(output_data, file, indent=2)

    print(f"Generated solution written to {output_file}")

    fe_packages, be_packages = process_packages(modules)

    fe_output_file = 'fe-openimis.json'
    with open(fe_output_file, 'w') as file:
        json.dump({"packages": fe_packages}, file, indent=2)
    print(f"Generated frontend packages written to {fe_output_file}")

    be_output_file = 'be-openimis.json'
    with open(be_output_file, 'w') as file:
        json.dump({"packages": be_packages}, file, indent=2)
    print(f"Generated backend packages written to {be_output_file}")

    roles = merge_roles(modules)
    roles_output_file = 'generated-roles.json'
    with open(roles_output_file, 'w') as file:
        json.dump({"roles": roles}, file, indent=2)
    print(f"Generated roles written to {roles_output_file}")


if __name__ == "__main__":
    main()

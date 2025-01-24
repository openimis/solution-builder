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


def _process_package(pkg, package_type):
    """
    Process a single package based on its type and return the transformed package.

    :param pkg: Dictionary containing package data.
    :param package_type: Type of package ('fe' or 'be').
    :return: Transformed package dictionary or None if type is unsupported.
    """
    if not isinstance(pkg, dict) or "type" not in pkg:
        return None

    print(pkg)  # This will help you debug the content of the package.

    # Function to clean the name by removing prefixes or suffixes
    def clean_name(name, package_type):
        if package_type == "fe":
            # For frontend packages, remove the 'openimis-fe-' prefix
            if name.startswith("openimis-fe-"):
                return name[len("openimis-fe-"):]  # Remove 'openimis-fe-' prefix
        elif package_type == "be":
            # For backend packages, remove the '_py' suffix
            if name.endswith("_py"):
                return name[:-3]  # Remove '_py' suffix
        return name

    # Process frontend packages
    if package_type == "fe":
        if pkg["type"] == "npm":
            # For npm frontend packages, clean the name and use the version constraint
            cleaned_name = clean_name(pkg["name"], "fe")
            return {
                "name": pkg["name"],
                "npm": f"@openimis/fe-{cleaned_name}@>=v{pkg['version'].lstrip('v')}"  # Add 'fe-' prefix after cleaning
            }
        elif pkg["type"] == "github":
            # For GitHub-based npm packages, clean the name and dynamically create the npm URL with branch/version support
            cleaned_name = clean_name(pkg["name"], "fe")
            branch_or_version = pkg.get('branch', 'develop')  # Default to 'develop' branch
            if 'version' in pkg:
                branch_or_version = pkg['version']  # Use the version if it's specified
            return {
                "name": pkg["name"],
                "npm": f"@openimis/fe-{cleaned_name}@https://github.com/openimis/{cleaned_name}_js#{branch_or_version}"  # GitHub URL with version/branch
            }

    # Process backend packages
    elif package_type == "be":
        if pkg["type"] == "pip":
            # For pip backend packages, clean the name and use the version constraint
            cleaned_name = clean_name(pkg["name"], "be")
            return {
                "name": pkg["name"],
                "pip": f"{cleaned_name}==v{pkg['version'].lstrip('v')}"  # Remove 'v' from version and clean the name
            }
        elif pkg["type"] == "github":
            # For GitHub-based pip packages, clean the name and dynamically create the pip URL with branch/version support
            cleaned_name = clean_name(pkg["name"], "be")
            branch_or_version = pkg.get('branch', 'develop')  # Default to 'develop' branch
            if 'version' in pkg:
                branch_or_version = pkg['version']  # Use the version if it's specified
            return {
                "name": pkg["name"],
                "pip": f"git+https://github.com/openimis/{cleaned_name}_py.git@{branch_or_version}#egg={cleaned_name}"  # GitHub URL with version/branch
            }

    # Return None if package type is unsupported
    return None


def process_packages(modules):
    """Process fe-packages and be-packages from module files."""
    fe_packages = []
    be_packages = []

    for module_file in modules:
        module_data = load_json(module_file)
        if not module_data:
            continue

        # Process frontend packages
        for pkg in module_data.get("fe-packages", []):
            processed_pkg = _process_package(pkg, "fe")
            if processed_pkg:
                fe_packages.append(processed_pkg)

        # Process backend packages
        for pkg in module_data.get("be-packages", []):
            processed_pkg = _process_package(pkg, "be")
            if processed_pkg:
                be_packages.append(processed_pkg)

    # Remove duplicates and sort
    fe_packages = sorted({frozenset(pkg.items()): pkg for pkg in fe_packages}.values(), key=lambda x: x["name"])
    be_packages = sorted({frozenset(pkg.items()): pkg for pkg in be_packages}.values(), key=lambda x: x["name"])

    return fe_packages, be_packages

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

    # Process packages
    fe_packages, be_packages = process_packages(modules)

    # Write frontend packages
    fe_output_file = 'fe-openimis.json'
    with open(fe_output_file, 'w') as file:
        json.dump({"packages": fe_packages}, file, indent=2)
    print(f"Generated frontend packages written to {fe_output_file}")

    # Write backend packages
    be_output_file = 'be-openimis.json'
    with open(be_output_file, 'w') as file:
        json.dump({"packages": be_packages}, file, indent=2)
    print(f"Generated backend packages written to {be_output_file}")


if __name__ == "__main__":
    main()

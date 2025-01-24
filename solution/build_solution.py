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


if __name__ == "__main__":
    main()

import json
# Make sure to delete this file before we push to the final product. Its just for showing all the possible errors and the format. 
# Load the JSON data from the file
with open('common_python_errors.json', 'r') as file:
    data = json.load(file)

# Iterate through the errors and display them
for error in data['errors']:
    print(f"Code: {error['code']}")
    print(f"Description: {error['description']}")
    if 'example' in error:
        print(f"Example:\n{error['example']}")
    print('-' * 40)
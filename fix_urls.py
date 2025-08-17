#!/usr/bin/env python3
"""
Script to replace all localhost:5000 URLs with dynamic API URLs in JavaScript files
"""

import re
import os

def fix_urls_in_file(filename):
    """Replace localhost:5000 URLs with dynamic API URLs"""
    
    # Read the file
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace patterns
    patterns = [
        # Replace fetch calls with localhost:5000
        (r'fetch\(`http://localhost:5000/api/([^`]+)`', r'fetch(getApiUrl(`/\1`)'),
        (r"fetch\('http://localhost:5000/api/([^']+)'", r"fetch(getApiUrl('/\1')"),
        (r'fetch\("http://localhost:5000/api/([^"]+)"', r'fetch(getApiUrl("/\1")'),
        
        # Replace console.log statements
        (r'console\.log\([^)]*`http://localhost:5000/api/([^`]+)`', r'console.log(\'Making fetch request to:\', getApiUrl(`/\1`)'),
    ]
    
    # Apply replacements
    for pattern, replacement in patterns:
        content = re.sub(pattern, replacement, content)
    
    # Write back to file
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"Fixed URLs in {filename}")

def main():
    """Main function to fix URLs in all JavaScript files"""
    
    # Files to process
    js_files = [
        'room-script.js',
        'script.js'
    ]
    
    for filename in js_files:
        if os.path.exists(filename):
            fix_urls_in_file(filename)
        else:
            print(f"File {filename} not found")

if __name__ == "__main__":
    main()

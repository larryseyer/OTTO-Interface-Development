#!/usr/bin/env python3
"""
Simple JavaScript syntax checker for script.js
"""

import re
import sys

def check_javascript(filename):
    """Check JavaScript file for basic issues"""
    issues = []

    with open(filename, 'r') as f:
        lines = f.readlines()

    # Check for common issues
    for i, line in enumerate(lines, 1):
        # Check for console.log statements (should use debugLog)
        if 'console.log(' in line and 'debugLog' not in line:
            issues.append(f"Line {i}: Found console.log - should use debugLog")

        # Check for == instead of === (excluding comments)
        if not line.strip().startswith('//'):
            if re.search(r'[^=!<>]==[^=]', line):
                issues.append(f"Line {i}: Found == - consider using ===")

        # Check for trailing whitespace
        if line.rstrip() != line.rstrip('\n'):
            issues.append(f"Line {i}: Trailing whitespace")

    # Check for balanced braces
    open_braces = 0
    for i, line in enumerate(lines, 1):
        # Skip comments
        clean_line = re.sub(r'//.*$', '', line)
        clean_line = re.sub(r'/\*.*?\*/', '', clean_line)

        open_braces += clean_line.count('{')
        open_braces -= clean_line.count('}')

    if open_braces != 0:
        issues.append(f"Unbalanced braces: {open_braces} extra {'opening' if open_braces > 0 else 'closing'} braces")

    return issues

if __name__ == "__main__":
    issues = check_javascript("script.js")

    if issues:
        print(f"Found {len(issues)} issues:")
        for issue in issues[:20]:  # Show first 20 issues
            print(f"  {issue}")
        if len(issues) > 20:
            print(f"  ... and {len(issues) - 20} more issues")
        sys.exit(1)
    else:
        print("No major issues found!")
        sys.exit(0)

import { test, expect, describe } from 'bun:test';
import { toonify, jsonify } from './src/index';

const userJson = {
    "test_metadata": {
        "description": "Comprehensive JSON Data Types Test",
        "generated_at_timestamp": 1715421200,
        "is_active": true
    },
    "basic_types": {
        "string_standard": "Hello World",
        "string_empty": "",
        "integer": 42,
        "integer_negative": -128,
        "float": 3.1415926535,
        "scientific_notation": 1.5e+10,
        "boolean_true": true,
        "boolean_false": false,
        "null_value": null
    },
    "string_edge_cases": {
        "unicode_chars": "Héllo Wörld \u00A9",
        "emojis": "🚀 🐱👤 👨💻",
        "escaped_chars": "Line 1\nLine 2\tTabbed\rCarriage \"Quoted\"",
        "html_tags": "<div><span class='bold'>Text</span></div>",
        "url": "https://api.example.com/v1/resource?query=test&sort=desc"
    },
    "arrays": {
        "empty_array": [],
        "array_of_strings": [
            "apple",
            "banana",
            "cherry"
        ],
        "array_of_numbers": [
            0,
            100,
            -50,
            2.5
        ],
        "array_of_booleans": [
            true,
            false,
            true
        ],
        "mixed_array": [
            1,
            "two",
            false,
            null,
            { "id": 5 }
        ],
        "array_of_arrays_matrix": [
            [1, 2, 3],
            [4, 5, 6],
            [7, 8, 9]
        ],
        "nested_mixed_arrays": [
            ["a", "b"],
            [1, 2],
            [{ "x": 1 }, ["deep"]]
        ]
    },
    "objects": {
        "empty_object": {},
        "array_of_objects": [
            {
                "id": 101,
                "role": "admin",
                "preferences": null
            },
            {
                "id": 102,
                "role": "editor",
                "preferences": { "theme": "dark" }
            }
        ],
        "nested_object": {
            "layer_1": {
                "layer_2": {
                    "layer_3": {
                        "target_value": "You found me"
                    }
                }
            }
        },
        "keys_with_spaces_and_symbols": {
            "User ID": 12345,
            "meta-data": "standard-kebab",
            "$schema_version": "1.0",
            "__private__": true
        }
    },
    "boundary_tests": {
        "max_safe_integer": 9007199254740991,
        "min_safe_integer": -9007199254740991,
        "very_long_string": "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua."
    }
};

describe('HyperToon Converter', () => {
    test('Round Trip', () => {
        const toon = toonify(userJson);
        console.log('--- TOON OUTPUT START ---');
        console.log(toon);
        console.log('--- TOON OUTPUT END ---');
        const json = jsonify(toon);
        expect(json).toEqual(userJson);
    });
});

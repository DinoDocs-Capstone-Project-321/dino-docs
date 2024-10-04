//generator.jsx
import './generator.css';
import React, { useState, useEffect, useReducer } from 'react';
import axios from 'axios';
import Field from '../../components/field/field'; // Import Field component from components folder

// Unique ID generator to fix issues with object property's input boxes losing focus
import { getUniqueId } from '../../utils/uniqueID'; // Import getUniqueId function

function Generator() {
    // State variables for schema
    const [schemaTitle, setSchemaTitle] = useState('');
    const [schemaDescription, setSchemaDescription] = useState('');
    const [numSamples, setNumSamples] = useState(3); // Default number of samples is 3
    const [response, setResponse] = useState(null);

    // State variable for data types
    const [dataTypes, setDataTypes] = useState([]);

    // State variable for form validation errors
    const [errors, setErrors] = useState([]);

    // Fetch data types from the API when the component mounts
    useEffect(() => {
        async function fetchDataTypes() {
            try {
                const response = await axios.get('http://127.0.0.1:8000/api/data-types/');
                setDataTypes(response.data);
            } catch (error) {
                console.error('Error fetching data types:', error);
            }
        }
        fetchDataTypes();
    }, []);

    function fieldsReducer(state, action) {
        switch (action.type) {
            // To add a new, blank field
            case 'ADD_FIELD':
                var newField = {
                    id: getUniqueId(),
                    keyTitle: '',
                    dataType: '',
                    description: '', // Used for 'Start Value' in autoIncrement
                    attributes: {},
                    properties: [],
                    items: null,
                };
                return state.concat([newField]);

            // To remove a field
            case 'REMOVE_FIELD':
                return state.filter((field) => field.id !== action.fieldId);

            // To update a field
            case 'UPDATE_FIELD':
                return state.map((field) => {
                    return updateField(field, action);
                });

            // To update the fields' new order
            case 'REORDER_FIELDS':
                return action.newOrder;

            // Default case
            default:
                return state;
        }
    }

    // Function to update fields
    function updateField(field, action) {
        if (field.id === action.fieldId) {
            var newField = Object.assign({}, field);
            newField[action.key] = action.value;
            return newField;
        } else {
            var updatedField = field;

            if (field.properties && field.properties.length > 0) {
                updatedField = Object.assign({}, field, {
                    properties: field.properties.map((prop) => {
                        return updateField(prop, action);
                    }),
                });
            }

            // Update for arrays
            if (field.items) {
                updatedField = Object.assign({}, updatedField, {
                    items: updateField(field.items, action),
                });
            }

            return updatedField;
        }
    }

    const [fields, dispatch] = useReducer(fieldsReducer, []);

    // Function to handle form submission
    async function handleSubmit(event) {
        event.preventDefault();

        // Input validation handling
        const validationErrors = [];
        // Validate schema title and description
        if (!schemaTitle.trim()) {
            validationErrors.push('Schema Title is required.');
        }
        if (!schemaDescription.trim()) {
            validationErrors.push('Schema Description is required.');
        }

        validateFields(fields, validationErrors);

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            return;
        } else {
            setErrors([]);
        }

        // Build the schema from the fields state
        const schemaData = {
            $schema: 'http://json-schema.org/draft-07/schema#',
            type: 'object',
            title: schemaTitle || 'Generated Schema',
            description: schemaDescription || 'This schema was generated by the user',
            properties: buildProperties(fields),
        };

        console.log('Generated Schema Data:', JSON.stringify(schemaData, null, 2));

        const dataToSend = {
            schema: schemaData, // This should be the complete schema object
            format: 'json', // Hardcoded to 'json'
            num_samples: numSamples,
        };

        console.log('Sending data:', dataToSend);

        try {
            const result = await axios.post('http://127.0.0.1:8000/api/generate-documents/', dataToSend, {
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            console.log('Response from server:', result.data);
            setResponse(result.data);
        } catch (error) {
            console.error('There was an error generating the documents!', error);
        }
    }

    // Function to validate fields recursively
    function validateFields(fields, errors, parentKey, rowNumber) {
        if (parentKey === undefined) parentKey = '';
        if (rowNumber === undefined) rowNumber = 1;

        fields.forEach((field, index) => {
            var fieldPath = parentKey ? parentKey + ' > Row ' + (index + 1) : 'Row ' + (index + 1);
            // Validate keyTitle
            if (!field.keyTitle) {
                errors.push('Key Title is required for ' + fieldPath + '.');
            } else if (/\s/.test(field.keyTitle)) {
                errors.push('Key Title cannot contain spaces in ' + fieldPath + '.');
            }
            if (!field.dataType) {
                errors.push('Data Type is required for ' + fieldPath + '.');
            }
            // Validate 'Start Value' for autoIncrement
            if (field.dataType === 'autoIncrement') {
                if (!field.description || field.description.trim() === '') {
                    errors.push('Start Value is required for ' + fieldPath + ' (autoIncrement).');
                } else if (isNaN(field.description)) {
                    errors.push('Start Value must be a number in ' + fieldPath + ' (autoIncrement).');
                }
            }
            if (field.dataType === 'object' && field.properties) {
                validateFields(field.properties, errors, fieldPath);
            }
            if (field.dataType === 'array' && field.items) {
                validateFields([field.items], errors, fieldPath);
            }
        });
    }

    // Function to build properties recursively
    function buildProperties(fields) {
        var properties = {};
        fields.forEach((field) => {
            if (field.keyTitle && field.dataType) {
                properties[field.keyTitle] = processField(field);
            }
        });
        return properties;
    }

    function processField(field) {
        var dataTypeInfo = mapDataType(field.dataType);
        if (!dataTypeInfo) {
            console.warn('Data type "' + field.dataType + '" not found.');
            return {};
        }

        var schemaField = {
            type: dataTypeInfo.type,
            description: field.description || '',
            dataType: field.dataType, // Include dataType in the schema for autoIncrement handling
        };

        if (dataTypeInfo.format) {
            schemaField.format = dataTypeInfo.format;
        }

        // Include additional attributes
        var fieldAttributes = field.attributes || {};
        for (var attr in fieldAttributes) {
            var value = fieldAttributes[attr];
            if (value !== '') {
                if (['minLength', 'maxLength', 'minimum', 'maximum'].indexOf(attr) !== -1) {
                    schemaField[attr] = parseInt(value, 10);
                } else {
                    schemaField[attr] = value;
                }
            }
        }

        if (dataTypeInfo.type === 'object' && field.properties && field.properties.length > 0) {
            schemaField.properties = buildProperties(field.properties);
        }

        if (dataTypeInfo.type === 'array' && field.items) {
            schemaField.items = processField(field.items);
        }

        return schemaField;
    }

    // Function to map data type value to its info
    function mapDataType(value) {
        var foundType = dataTypes.find((dataType) => dataType.value === value);
        return foundType || null;
    }

    // // Function to handle drag and drop
    // function handleDragStart(e, index, parentField) {
    //     if (parentField === undefined) parentField = null;
    //     e.dataTransfer.setData(
    //         'text/plain',
    //         JSON.stringify({ index: index, parentFieldId: parentField ? parentField.id : null })
    //     );
    // }

    // function handleDragOver(e) {
    //     e.preventDefault();
    // }

    // function handleDrop(e, dropIndex, parentField) {
    //     if (parentField === undefined) parentField = null;
    //     e.preventDefault();
    //     var data = JSON.parse(e.dataTransfer.getData('text/plain'));
    //     var dragIndex = data.index;
    //     var parentFieldId = data.parentFieldId;

    //     if (parentField && parentFieldId === parentField.id) {
    //         var propertiesCopy = parentField.properties.slice();
    //         var movedField = propertiesCopy.splice(dragIndex, 1)[0];
    //         propertiesCopy.splice(dropIndex, 0, movedField);
    //         dispatch({
    //             type: 'UPDATE_FIELD',
    //             fieldId: parentField.id,
    //             key: 'properties',
    //             value: propertiesCopy,
    //         });
    //     } else if (!parentField && !parentFieldId) {
    //         var fieldsCopy = fields.slice();
    //         var movedField = fieldsCopy.splice(dragIndex, 1)[0];
    //         fieldsCopy.splice(dropIndex, 0, movedField);
    //         dispatch({ type: 'REORDER_FIELDS', newOrder: fieldsCopy });
    //     }
    // }

    // Main component render
    return (
        <div>
            <h1>Data Generator</h1>
            <div className="sample-count">
                <label>Number of Samples:</label>
                <input
                    type="number"
                    value={numSamples}
                    onChange={(e) => setNumSamples(parseInt(e.target.value) || 1)}
                    min="1"
                    step="1"
                />
            </div>
            <div className="schema-title">
                <label>Schema Title:</label>
                <input
                    type="text"
                    value={schemaTitle}
                    onChange={(e) => setSchemaTitle(e.target.value)}
                />
            </div>

            {errors.length > 0 && (
                <div className="errors">
                    <h3>Form Errors:</h3>
                    <ul>
                        {errors.map((error, index) => (
                            <li key={index} style={{ color: 'red' }}>
                                {error}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="fields-container">
                {fields.map((field, index) => (
                    <Field
                        key={field.id}
                        field={field}
                        index={index}
                        dataTypes={dataTypes}
                        dispatch={dispatch}
                        onRemove={() => dispatch({ type: 'REMOVE_FIELD', fieldId: field.id })}
                        parentField={null}
                        fields={fields} // Pass fields
                        getUniqueId={getUniqueId} // Pass getUniqueId
                    />
                ))}
            </div>
            <button type="button" onClick={() => dispatch({ type: 'ADD_FIELD' })}>
                Add Property
            </button>
            <button type="button" onClick={handleSubmit}>
                Submit
            </button>

            <div className="prompt-container">
                <input
                    type="text"
                    placeholder="Schema Description"
                    value={schemaDescription}
                    onChange={(e) => setSchemaDescription(e.target.value)}
                />
            </div>

            {response && (
                <div className="response">
                    <h3>Response from Server:</h3>
                    <pre>{JSON.stringify(response, null, 2)}</pre>
                </div>
            )}
        </div>
    );
}

export default Generator;
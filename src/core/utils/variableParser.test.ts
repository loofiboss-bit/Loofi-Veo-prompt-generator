import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findVariables,
  replaceVariables,
  validateVariables,
  parseVariableWithDefault,
  insertVariable,
  getUsedVariables,
  createCustomVariable,
  getVariablesByCategory,
  mergeVariables,
  exportVariables,
  importVariables,
  highlightVariables,
  Variable,
} from './variableParser';

// Mock logger
vi.mock('@core/services/loggerService', () => ({
  logger: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('findVariables', () => {
  it('should return empty array for text without variables', () => {
    const result = findVariables('This is plain text');
    expect(result).toEqual([]);
  });

  it('should find single variable', () => {
    const result = findVariables('Hello {{name}}');
    expect(result).toHaveLength(1);
    expect(result[0].variable).toBe('name');
    expect(result[0].fullMatch).toBe('{{name}}');
  });

  it('should find multiple variables', () => {
    const result = findVariables('{{greeting}} {{name}}, welcome to {{place}}');
    expect(result).toHaveLength(3);
    expect(result[0].variable).toBe('greeting');
    expect(result[1].variable).toBe('name');
    expect(result[2].variable).toBe('place');
  });

  it('should find variables with defaults', () => {
    const result = findVariables('Hello {{name:Unknown}}');
    expect(result).toHaveLength(1);
    expect(result[0].variable).toBe('name');
    expect(result[0].fullMatch).toBe('{{name:Unknown}}');
  });

  it('should track variable positions correctly', () => {
    const result = findVariables('Start {{var1}} middle {{var2}} end');
    expect(result[0].start).toBe(6);
    expect(result[0].end).toBe(14); // 6 + 8 ({{var1}})
    expect(result[1].start).toBe(22);
    expect(result[1].end).toBe(30); // 22 + 8 ({{var2}})
  });

  it('should handle consecutive variables', () => {
    const result = findVariables('{{a}}{{b}}');
    expect(result).toHaveLength(2);
  });
});

describe('replaceVariables', () => {
  it('should replace variables with provided values', () => {
    const text = 'Hello {{name}}, welcome to {{place}}';
    const variables = { name: 'Alice', place: 'Wonderland' };
    const result = replaceVariables(text, variables);
    expect(result).toBe('Hello Alice, welcome to Wonderland');
  });

  it('should use default values when useDefaults is true', () => {
    const text = 'Hello {{name:Guest}}';
    const variables = {};
    const result = replaceVariables(text, variables, { useDefaults: true });
    expect(result).toBe('Hello Guest');
  });

  it('should keep placeholder when no value and no default', () => {
    const text = 'Hello {{name}}';
    const variables = {};
    const result = replaceVariables(text, variables, { useDefaults: false });
    expect(result).toBe('Hello {{name}}');
  });

  it('should throw error when throwOnMissing is true and variable missing', () => {
    const text = 'Hello {{name}}';
    const variables = {};
    expect(() => replaceVariables(text, variables, { throwOnMissing: true })).toThrow(
      "Variable 'name' is not defined",
    );
  });

  it('should prefer provided value over default', () => {
    const text = 'Hello {{name:Guest}}';
    const variables = { name: 'Alice' };
    const result = replaceVariables(text, variables);
    expect(result).toBe('Hello Alice');
  });

  it('should handle multiple occurrences of same variable', () => {
    const text = '{{greeting}} {{name}}, you are {{name}}';
    const variables = { greeting: 'Hello', name: 'Alice' };
    const result = replaceVariables(text, variables);
    expect(result).toBe('Hello Alice, you are Alice');
  });
});

describe('validateVariables', () => {
  it('should return isValid:true when all variables have values', () => {
    const text = '{{greeting}} {{name}}';
    const variables = { greeting: 'Hello', name: 'Alice' };
    const result = validateVariables(text, variables);
    expect(result.isValid).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('should return isValid:false when variables are missing', () => {
    const text = '{{greeting}} {{name}}';
    const variables = { greeting: 'Hello' };
    const result = validateVariables(text, variables);
    expect(result.isValid).toBe(false);
    expect(result.missing).toContain('name');
  });

  it('should deduplicate missing variables', () => {
    const text = '{{name}} and {{name}} and {{place}}';
    const variables = {};
    const result = validateVariables(text, variables);
    expect(result.missing).toEqual(['name', 'place']);
  });

  it('should treat empty string as missing', () => {
    const text = '{{name}}';
    const variables = { name: '' };
    const result = validateVariables(text, variables);
    expect(result.isValid).toBe(false);
    expect(result.missing).toContain('name');
  });

  it('should handle text with no variables', () => {
    const result = validateVariables('Plain text', {});
    expect(result.isValid).toBe(true);
    expect(result.missing).toEqual([]);
  });
});

describe('parseVariableWithDefault', () => {
  it('should parse variable without default', () => {
    const result = parseVariableWithDefault('{{name}}');
    expect(result.name).toBe('name');
    expect(result.defaultValue).toBeUndefined();
  });

  it('should parse variable with default', () => {
    const result = parseVariableWithDefault('{{name:Alice}}');
    expect(result.name).toBe('name');
    expect(result.defaultValue).toBe('Alice');
  });

  it('should handle default values with colons', () => {
    const result = parseVariableWithDefault('{{time:12:30}}');
    expect(result.name).toBe('time');
    expect(result.defaultValue).toBe('12:30');
  });

  it('should throw error for invalid placeholder', () => {
    expect(() => parseVariableWithDefault('not a variable')).toThrow(
      'Invalid variable placeholder',
    );
    expect(() => parseVariableWithDefault('name')).toThrow('Invalid variable placeholder');
  });

  it('should handle default value with special characters', () => {
    const result = parseVariableWithDefault('{{time:12:30 PM}}');
    expect(result.name).toBe('time');
    expect(result.defaultValue).toBe('12:30 PM');
  });
});

describe('insertVariable', () => {
  it('should insert variable at cursor position', () => {
    const text = 'Hello world';
    const result = insertVariable(text, 5, 'name');
    expect(result.newText).toBe('Hello{{name}} world');
    expect(result.newCursorPosition).toBe(13);
  });

  it('should insert variable with default value', () => {
    const text = 'Say ';
    const result = insertVariable(text, 4, 'greeting', 'Hello');
    expect(result.newText).toBe('Say {{greeting:Hello}}');
    expect(result.newCursorPosition).toBe(22); // 4 + placeholder.length
  });

  it('should insert at beginning', () => {
    const text = 'world';
    const result = insertVariable(text, 0, 'greeting');
    expect(result.newText).toBe('{{greeting}}world');
  });

  it('should insert at end', () => {
    const text = 'Hello ';
    const result = insertVariable(text, 6, 'name');
    expect(result.newText).toBe('Hello {{name}}');
  });

  it('should return correct new cursor position', () => {
    const text = 'test';
    const result = insertVariable(text, 2, 'var');
    expect(result.newCursorPosition).toBe(2 + 7); // 7 = {{var}}
  });
});

describe('getUsedVariables', () => {
  it('should return empty array for text with no variables', () => {
    const result = getUsedVariables('Plain text');
    expect(result).toEqual([]);
  });

  it('should return unique variables', () => {
    const result = getUsedVariables('{{name}} and {{name}} and {{place}}');
    expect(result).toEqual(['name', 'place']);
  });

  it('should handle single variable', () => {
    const result = getUsedVariables('Hello {{name}}');
    expect(result).toEqual(['name']);
  });

  it('should preserve order of first occurrence', () => {
    const result = getUsedVariables('{{b}} {{a}} {{b}}');
    expect(result).toEqual(['b', 'a']);
  });
});

describe('createCustomVariable', () => {
  it('should create valid variable', () => {
    const variable = createCustomVariable('my_var', 'value', 'A custom variable');
    expect(variable.name).toBe('my_var');
    expect(variable.value).toBe('value');
    expect(variable.description).toBe('A custom variable');
    expect(variable.category).toBe('custom');
  });

  it('should accept alphanumeric names with underscores', () => {
    expect(() => createCustomVariable('valid_name_123', 'value')).not.toThrow();
  });

  it('should reject names with hyphens', () => {
    expect(() => createCustomVariable('invalid-name', 'value')).toThrow(
      'Variable name can only contain letters, numbers, and underscores',
    );
  });

  it('should reject names with spaces', () => {
    expect(() => createCustomVariable('invalid name', 'value')).toThrow(
      'Variable name can only contain letters, numbers, and underscores',
    );
  });

  it('should reject empty names', () => {
    expect(() => createCustomVariable('', 'value')).toThrow(
      'Variable name can only contain letters, numbers, and underscores',
    );
  });

  it('should allow variable without description', () => {
    const variable = createCustomVariable('name', 'value');
    expect(variable.description).toBeUndefined();
  });
});

describe('getVariablesByCategory', () => {
  it('should filter variables by category', () => {
    const variables: Record<string, Variable> = {
      char_name: { name: 'char_name', value: 'Alice', category: 'character' },
      char_age: { name: 'char_age', value: '25', category: 'character' },
      location: { name: 'location', value: 'Forest', category: 'location' },
    };

    const chars = getVariablesByCategory(variables, 'character');
    expect(chars).toHaveLength(2);
    expect(chars[0].category).toBe('character');
    expect(chars[1].category).toBe('character');
  });

  it('should return empty array when no variables match category', () => {
    const variables: Record<string, Variable> = {
      char_name: { name: 'char_name', value: 'Alice', category: 'character' },
    };

    const custom = getVariablesByCategory(variables, 'custom');
    expect(custom).toEqual([]);
  });
});

describe('mergeVariables', () => {
  it('should merge two variable sets', () => {
    const set1 = { name: 'Alice', age: '25' };
    const set2 = { place: 'Forest' };
    const result = mergeVariables(set1, set2);
    expect(result).toEqual({ name: 'Alice', age: '25', place: 'Forest' });
  });

  it('should have later values override earlier ones', () => {
    const set1 = { name: 'Alice', shared: 'first' };
    const set2 = { shared: 'second' };
    const result = mergeVariables(set1, set2);
    expect(result.shared).toBe('second');
  });

  it('should handle multiple sets', () => {
    const result = mergeVariables({ a: '1' }, { b: '2' }, { c: '3' });
    expect(result).toEqual({ a: '1', b: '2', c: '3' });
  });

  it('should return empty object for no arguments', () => {
    const result = mergeVariables();
    expect(result).toEqual({});
  });
});

describe('exportVariables', () => {
  it('should export custom variables to JSON', () => {
    const variables: Record<string, Variable> = {
      custom_var: {
        name: 'custom_var',
        value: 'test',
        description: 'A test variable',
        category: 'custom',
      },
    };

    const json = exportVariables(variables);
    expect(() => JSON.parse(json)).not.toThrow();

    const data = JSON.parse(json);
    expect(data.version).toBe('1.2.0');
    expect(data.exportDate).toBeDefined();
    expect(data.variables).toHaveLength(1);
    expect(data.variables[0].name).toBe('custom_var');
  });

  it('should only export custom category variables', () => {
    const variables: Record<string, Variable> = {
      char_name: { name: 'char_name', value: 'Alice', category: 'character' },
      custom_var: { name: 'custom_var', value: 'test', category: 'custom' },
    };

    const json = exportVariables(variables);
    const data = JSON.parse(json);
    expect(data.variables).toHaveLength(1);
    expect(data.variables[0].category).toBe('custom');
  });

  it('should include export timestamp', () => {
    const variables: Record<string, Variable> = {};
    const json = exportVariables(variables);
    const data = JSON.parse(json);
    expect(new Date(data.exportDate)).toBeInstanceOf(Date);
  });
});

describe('importVariables', () => {
  it('should import variables from JSON', () => {
    const jsonData = JSON.stringify({
      version: '1.2.0',
      exportDate: new Date().toISOString(),
      variables: [
        { name: 'var1', value: 'value1', description: 'Var 1', category: 'custom' },
        { name: 'var2', value: 'value2', category: 'custom' },
      ],
    });

    const result = importVariables(jsonData);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('var1');
    expect(result[1].name).toBe('var2');
  });

  it('should handle variables without description', () => {
    const jsonData = JSON.stringify({
      version: '1.2.0',
      variables: [{ name: 'var1', value: 'value1' }],
    });

    const result = importVariables(jsonData);
    expect(result[0].description).toBeUndefined();
  });

  it('should throw error for invalid JSON', () => {
    expect(() => importVariables('not valid json')).toThrow();
  });

  it('should throw error for missing variables array', () => {
    const jsonData = JSON.stringify({ version: '1.2.0' });
    expect(() => importVariables(jsonData)).toThrow('Invalid variables data format');
  });

  it('should provide empty value for variables without it', () => {
    const jsonData = JSON.stringify({
      version: '1.2.0',
      variables: [{ name: 'var1' }],
    });

    const result = importVariables(jsonData);
    expect(result[0].value).toBe('');
  });

  it('should support round-trip export/import', () => {
    const original: Record<string, Variable> = {
      custom_var: {
        name: 'custom_var',
        value: 'test',
        description: 'Test variable',
        category: 'custom',
      },
    };

    const exported = exportVariables(original);
    const imported = importVariables(exported);

    expect(imported[0].name).toBe('custom_var');
    expect(imported[0].value).toBe('test');
    expect(imported[0].description).toBe('Test variable');
  });
});

describe('highlightVariables', () => {
  it('should split text with no variables', () => {
    const result = highlightVariables('Plain text');
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('text');
    expect(result[0].content).toBe('Plain text');
  });

  it('should split text with single variable', () => {
    const result = highlightVariables('Hello {{name}}');
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('text');
    expect(result[0].content).toBe('Hello ');
    expect(result[1].type).toBe('variable');
    expect(result[1].variable).toBe('name');
  });

  it('should split text with multiple variables', () => {
    const result = highlightVariables('{{greeting}} {{name}}, welcome {{place}}');
    expect(result.length).toBeGreaterThan(2);
    expect(result.filter((s) => s.type === 'variable')).toHaveLength(3);
  });

  it('should handle variable at start', () => {
    const result = highlightVariables('{{name}} is here');
    expect(result[0].type).toBe('variable');
    expect(result[1].type).toBe('text');
  });

  it('should handle variable at end', () => {
    const result = highlightVariables('Welcome {{name}}');
    expect(result[result.length - 1].type).toBe('variable');
  });

  it('should handle consecutive variables', () => {
    const result = highlightVariables('{{a}}{{b}}');
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe('variable');
    expect(result[1].type).toBe('variable');
  });

  it('should preserve variable default syntax in content', () => {
    const result = highlightVariables('Hello {{name:Guest}}');
    const varElement = result.find((s) => s.type === 'variable');
    expect(varElement?.content).toBe('{{name:Guest}}');
    expect(varElement?.variable).toBe('name');
  });

  it('should include remaining text after last variable', () => {
    const result = highlightVariables('Start {{var}} end');
    expect(result[result.length - 1].type).toBe('text');
    expect(result[result.length - 1].content).toBe(' end');
  });
});

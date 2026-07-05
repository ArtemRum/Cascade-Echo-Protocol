// Простой тест для отладки нормализации
const path = '/usr/lib/x86_64-linux-gnu/../../bin/ls';
console.log('Testing path:', path);

// Имитируем логику _normalizePath
function normalizePath(path) {
  if (!path) return '';
  if (path === '') return '';
  
  let normalized = path.replace(/\/+/g, '/');
  const isAbsolute = normalized.startsWith('/');
  const components = normalized.split('/').filter(c => c !== '');
  
  console.log('Components:', components);
  console.log('Is absolute:', isAbsolute);
  
  const result = [];
  
  for (const component of components) {
    console.log('Processing:', component, 'result so far:', result);
    if (component === '.') {
      continue;
    } else if (component === '..') {
      if (result.length > 0) {
        result.pop();
      } else if (isAbsolute) {
        // Абсолютный путь выше корня - остаемся в корне
      } else {
        result.push('..');
      }
    } else {
      result.push(component);
    }
  }
  
  let finalPath = result.join('/');
  if (isAbsolute) {
    finalPath = '/' + finalPath;
  }
  
  console.log('Final result:', finalPath);
  return finalPath;
}

const result = normalizePath(path);
console.log('Normalized:', result);
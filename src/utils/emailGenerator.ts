/**
 * Gera um email corporativo baseado no nome do funcionário e empresa
 * Usa apenas primeiro nome e último sobrenome para manter emails curtos
 */
export function generateEmployeeEmail(fullName: string, companyName: string): string {
  // Normalizar e dividir o nome
  const nameParts = fullName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .split(/\s+/)
    .filter(part => part.length > 0);

  // Pegar primeiro nome e último sobrenome
  let emailName: string;
  if (nameParts.length === 1) {
    emailName = nameParts[0];
  } else {
    const firstName = nameParts[0];
    const lastName = nameParts[nameParts.length - 1];
    emailName = `${firstName}.${lastName}`;
  }

  // Normalizar nome da empresa
  const normalizedCompany = companyName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

  return `${emailName}@${normalizedCompany}.com.br`;
}

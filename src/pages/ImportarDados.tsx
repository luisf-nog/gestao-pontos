import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { calculateWorkedHours, calculateDailyAndOvertimeValues } from '@/utils/timeCalculations';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface ImportResult {
  companies: number;
  employees: number;
  timeRecords: number;
  errors: string[];
}

export default function ImportarDados() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();
  const { hasRole } = useAuth();
  const navigate = useNavigate();

  // Apenas dev pode acessar
  if (!hasRole('dev')) {
    navigate('/dashboard');
    return null;
  }

  const parseCSVLine = (line: string): string[] => {
    return line.split(';').map(field => field.trim());
  };

  const parseDate = (dateStr: string): string => {
    // Convert DD/MM/YYYY to YYYY-MM-DD
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && selectedFile.type === 'text/csv') {
      setFile(selectedFile);
      setResult(null);
    } else {
      toast({
        variant: 'destructive',
        title: 'Arquivo inválido',
        description: 'Por favor, selecione um arquivo CSV.',
      });
    }
  };

  const processImport = async () => {
    if (!file) return;

    setImporting(true);
    setProgress(0);
    const errors: string[] = [];
    
    try {
      // Read file content
      const text = await file.text();
      const lines = text.split('\n').filter(line => line.trim());
      
      // Skip header
      const dataLines = lines.slice(1);
      
      // Extract unique companies and employees
      const companiesMap = new Map<string, { name: string; daily_rate: number; overtime_rate: number }>();
      const employeesMap = new Map<string, { name: string; company: string }>();
      const timeRecordsData: any[] = [];

      // First pass: collect unique companies and employees
      dataLines.forEach((line, index) => {
        try {
          const [company, date, employee, entry, exit] = parseCSVLine(line);
          
          if (!company || !employee) return;

          // Default rates - you can modify these
          if (!companiesMap.has(company)) {
            companiesMap.set(company, {
              name: company,
              daily_rate: 150.00, // Default daily rate
              overtime_rate: 25.00, // Default overtime rate
            });
          }

          const employeeKey = `${employee}-${company}`;
          if (!employeesMap.has(employeeKey)) {
            employeesMap.set(employeeKey, { name: employee, company });
          }
        } catch (error) {
          errors.push(`Erro na linha ${index + 2}: ${error}`);
        }
      });

      setProgress(20);

      // Insert companies
      const companyIds = new Map<string, string>();
      let processedCompanies = 0;

      for (const [companyName, companyData] of companiesMap) {
        try {
          // Check if company already exists
          const { data: existingCompany } = await supabase
            .from('companies')
            .select('id')
            .eq('name', companyName)
            .maybeSingle();

          if (existingCompany) {
            companyIds.set(companyName, existingCompany.id);
          } else {
            const { data, error } = await supabase
              .from('companies')
              .insert([companyData])
              .select()
              .single();

            if (error) throw error;
            companyIds.set(companyName, data.id);
          }
          processedCompanies++;
        } catch (error: any) {
          errors.push(`Erro ao inserir empresa ${companyName}: ${error.message}`);
        }
      }

      setProgress(40);

      // Insert employees
      const employeeIds = new Map<string, string>();
      let processedEmployees = 0;

      for (const [employeeKey, employeeData] of employeesMap) {
        try {
          const companyId = companyIds.get(employeeData.company);
          if (!companyId) continue;

          // Check if employee already exists
          const { data: existingEmployee } = await supabase
            .from('employees')
            .select('id')
            .eq('name', employeeData.name)
            .eq('company_id', companyId)
            .maybeSingle();

          if (existingEmployee) {
            employeeIds.set(employeeKey, existingEmployee.id);
          } else {
            const { data, error } = await supabase
              .from('employees')
              .insert([{
                name: employeeData.name,
                company_id: companyId,
              }])
              .select()
              .single();

            if (error) throw error;
            employeeIds.set(employeeKey, data.id);
          }
          processedEmployees++;
        } catch (error: any) {
          errors.push(`Erro ao inserir funcionário ${employeeData.name}: ${error.message}`);
        }
      }

      setProgress(60);

      // Insert time records
      let processedRecords = 0;
      const batchSize = 50;
      
      for (let i = 0; i < dataLines.length; i += batchSize) {
        const batch = dataLines.slice(i, i + batchSize);
        const recordsToInsert: any[] = [];

        for (const line of batch) {
          try {
            const [company, dateStr, employee, entryTime, exitTime] = parseCSVLine(line);
            
            if (!company || !employee || !dateStr || !entryTime || !exitTime) continue;

            const employeeKey = `${employee}-${company}`;
            const employeeId = employeeIds.get(employeeKey);
            const companyId = companyIds.get(company);
            
            if (!employeeId || !companyId) continue;

            const companyData = companiesMap.get(company);
            if (!companyData) continue;

            const date = parseDate(dateStr);
            const workedHours = calculateWorkedHours(entryTime, exitTime);
            const recordDate = new Date(date + 'T00:00:00');
            const { dailyValue, overtimeValue, totalValue } = calculateDailyAndOvertimeValues(
              workedHours,
              recordDate,
              companyData.daily_rate,
              companyData.overtime_rate
            );

            recordsToInsert.push({
              employee_id: employeeId,
              date,
              entry_time: entryTime,
              exit_time: exitTime,
              worked_hours: workedHours,
              daily_value: dailyValue,
              overtime_value: overtimeValue,
              total_value: totalValue,
            });
          } catch (error: any) {
            errors.push(`Erro ao processar registro: ${error.message}`);
          }
        }

        if (recordsToInsert.length > 0) {
          const { error } = await supabase
            .from('time_records')
            .insert(recordsToInsert);

          if (error) {
            errors.push(`Erro ao inserir lote de registros: ${error.message}`);
          } else {
            processedRecords += recordsToInsert.length;
          }
        }

        setProgress(60 + (40 * (i + batchSize) / dataLines.length));
      }

      setProgress(100);

      setResult({
        companies: processedCompanies,
        employees: processedEmployees,
        timeRecords: processedRecords,
        errors,
      });

      toast({
        title: 'Importação concluída!',
        description: `${processedCompanies} empresas, ${processedEmployees} funcionários e ${processedRecords} registros importados.`,
      });

    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro na importação',
        description: error.message,
      });
      errors.push(`Erro geral: ${error.message}`);
      setResult({
        companies: 0,
        employees: 0,
        timeRecords: 0,
        errors,
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Importar Dados</h1>
        <p className="text-muted-foreground">
          Importe empresas, funcionários e registros de ponto a partir de um arquivo CSV
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Formato do Arquivo</CardTitle>
          <CardDescription>
            O arquivo CSV deve conter as seguintes colunas separadas por ponto e vírgula (;):
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm font-mono bg-muted p-2 rounded">
              EMPRESA;DATA;NOME;ENTRADA;SAÍDA;GESTOR;SETOR
            </p>
            <p className="text-sm text-muted-foreground">
              • <strong>EMPRESA</strong>: Nome da empresa<br />
              • <strong>DATA</strong>: Data no formato DD/MM/YYYY<br />
              • <strong>NOME</strong>: Nome do funcionário<br />
              • <strong>ENTRADA</strong>: Horário de entrada (HH:MM:SS)<br />
              • <strong>SAÍDA</strong>: Horário de saída (HH:MM:SS)<br />
              • <strong>GESTOR</strong>: Opcional<br />
              • <strong>SETOR</strong>: Opcional
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selecionar Arquivo</CardTitle>
          <CardDescription>
            Escolha o arquivo CSV para importação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Arquivo CSV</Label>
            <Input
              id="file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={importing}
            />
          </div>

          {file && (
            <Alert>
              <FileSpreadsheet className="h-4 w-4" />
              <AlertTitle>Arquivo selecionado</AlertTitle>
              <AlertDescription>
                {file.name} ({(file.size / 1024).toFixed(2)} KB)
              </AlertDescription>
            </Alert>
          )}

          {importing && (
            <div className="space-y-2">
              <Label>Progresso da importação</Label>
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {progress.toFixed(0)}%
              </p>
            </div>
          )}

          <Button
            onClick={processImport}
            disabled={!file || importing}
            className="w-full"
          >
            <Upload className="mr-2 h-4 w-4" />
            {importing ? 'Importando...' : 'Iniciar Importação'}
          </Button>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Resultado da Importação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Empresas</p>
                  <p className="text-2xl font-bold">{result.companies}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Funcionários</p>
                  <p className="text-2xl font-bold">{result.employees}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Registros</p>
                  <p className="text-2xl font-bold">{result.timeRecords}</p>
                </div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erros encontrados ({result.errors.length})</AlertTitle>
                <AlertDescription>
                  <div className="mt-2 max-h-40 overflow-y-auto space-y-1">
                    {result.errors.slice(0, 10).map((error, index) => (
                      <p key={index} className="text-sm">• {error}</p>
                    ))}
                    {result.errors.length > 10 && (
                      <p className="text-sm font-semibold">
                        ... e mais {result.errors.length - 10} erros
                      </p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CohortRetentionProps {
  cohortData: any[];
}

export default function CohortRetention({ cohortData }: CohortRetentionProps) {
  if (!cohortData || cohortData.length === 0) {
    return (
      <Card className="border-border/40">
        <CardHeader>
          <CardTitle className="text-base">📊 Cohort Retention</CardTitle>
          <CardDescription>Retención de usuarios por mes de registro</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-4">
            No hay suficientes datos de cohortes aún.
          </p>
        </CardContent>
      </Card>
    );
  }

  const retentionColor = (val: number | null, threshold: number) => {
    if (val === null) return '';
    return val >= threshold ? 'text-green-600 font-medium' : '';
  };

  return (
    <Card className="border-border/40">
      <CardHeader>
        <CardTitle className="text-base">📊 Cohort Retention</CardTitle>
        <CardDescription>Retención de usuarios por mes de registro</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cohorte</TableHead>
              <TableHead>Mes 0</TableHead>
              <TableHead>Mes 1</TableHead>
              <TableHead>Mes 3</TableHead>
              <TableHead>Mes 6</TableHead>
              <TableHead>Mes 12</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {cohortData.map((cohort: any, index: number) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{cohort.month}</TableCell>
                <TableCell className="text-green-600 font-medium">{cohort.m0}%</TableCell>
                <TableCell>
                  {cohort.m1 !== null ? (
                    <span className={retentionColor(cohort.m1, 80)}>{cohort.m1}%</span>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {cohort.m3 !== null ? (
                    <span className={retentionColor(cohort.m3, 70)}>{cohort.m3}%</span>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {cohort.m6 !== null ? (
                    <span className={retentionColor(cohort.m6, 60)}>{cohort.m6}%</span>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {cohort.m12 !== null ? (
                    <span className={retentionColor(cohort.m12, 50)}>{cohort.m12}%</span>
                  ) : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

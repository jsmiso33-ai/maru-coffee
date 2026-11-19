import { Button, Card } from '../components/ui.jsx';

export function NotFound({ what = '노트' }) {
  return (
    <Card className="mx-auto max-w-md px-6 py-12 text-center">
      <p className="font-semibold">{what}를 찾을 수 없어요</p>
      <p className="mt-1 text-sm text-muted">삭제됐거나 주소가 잘못됐을 수 있어요.</p>
      <Button variant="outline" to="/" className="mt-5">홈으로</Button>
    </Card>
  );
}

import { NextRequest } from 'next/server';
import handler from '@/lib/ai-chat';

export async function POST(req: NextRequest) {
  const body = await req.json();
  let statusCode = 200;
  let jsonData: any = {};
  const res = {
    status: (code: number) => {
      statusCode = code;
      return res;
    },
    json: (data: any) => {
      jsonData = data;
      return null;
    }
  };
  await handler({ body, method: 'POST' } as any, res as any);
  return new Response(JSON.stringify(jsonData), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { verifyProgram, formatVerificationResult, type VerificationResult } from '@/lib/logic-comparator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userLogic, smbpContent } = body;

    if (!userLogic || !smbpContent) {
      return NextResponse.json(
        { error: 'Missing required fields: userLogic and smbpContent' },
        { status: 400 }
      );
    }

    // Run verification
    const result: VerificationResult = verifyProgram(userLogic, smbpContent);

    // Also return formatted text version
    const formattedResult = formatVerificationResult(result);

    return NextResponse.json({
      success: true,
      result,
      formatted: formattedResult
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      {
        error: 'Verification failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

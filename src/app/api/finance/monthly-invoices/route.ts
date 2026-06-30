import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { computeMonthlyInvoiceAmount } from "@/lib/monthly-fee";

type ChargeResult = {
  studentId: string;
  firstName: string;
  lastName: string;
  amount: number;
};

type SkipResult = {
  studentId: string;
  firstName: string;
  lastName: string;
  reason: string;
};

export async function POST(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const mode = body.mode as string | undefined;
    const classId = body.classId != null ? Number(body.classId) : undefined;
    const studentIdStr =
      body.studentStudentId != null
        ? String(body.studentStudentId).trim()
        : body.studentId != null
          ? String(body.studentId).trim()
          : "";
    const year = Number(body.year);
    const month = Number(body.month);
    const note = body.note != null ? String(body.note).trim().slice(0, 500) : null;

    if (mode !== "class" && mode !== "student") {
      return NextResponse.json(
        { error: 'mode must be "class" or "student"' },
        { status: 400 }
      );
    }

    if (!Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Invalid year" }, { status: 400 });
    }

    if (!Number.isInteger(month) || month < 1 || month > 12) {
      return NextResponse.json({ error: "Month must be 1–12" }, { status: 400 });
    }

    if (mode === "class") {
      if (!Number.isInteger(classId) || (classId as number) <= 0) {
        return NextResponse.json({ error: "classId is required for class mode" }, { status: 400 });
      }
    } else {
      if (!studentIdStr) {
        return NextResponse.json(
          { error: "Student ID is required for student mode" },
          { status: 400 }
        );
      }
    }

    const includeDept = {
      department: { select: { registrationFee: true } },
    } as const;

    let students;
    if (mode === "class") {
      students = await prisma.student.findMany({
        where: { classId: classId as number, status: "Admitted" },
        include: includeDept,
        orderBy: { studentId: "asc" },
      });
    } else {
      const one = await prisma.student.findUnique({
        where: { studentId: studentIdStr },
        include: includeDept,
      });
      students = one && one.status === "Admitted" ? [one] : [];
    }

    if (students.length === 0) {
      return NextResponse.json(
        {
          error:
            mode === "class"
              ? "No admitted students in this class"
              : "Student not found or not admitted",
        },
        { status: 404 }
      );
    }

    const charged: ChargeResult[] = [];
    const skipped: SkipResult[] = [];

    await prisma.$transaction(async (tx) => {
      for (const s of students) {
        const amount = computeMonthlyInvoiceAmount(s.fee, s.paymentStatus);

        if (amount <= 0) {
          skipped.push({
            studentId: s.studentId,
            firstName: s.firstName,
            lastName: s.lastName,
            reason:
              s.paymentStatus === "Full Scholarship"
                ? "Full scholarship (no monthly charge)"
                : "Fee amount is zero — set student monthly fee",
          });
          continue;
        }

        const existing = await tx.studentMonthlyInvoice.findUnique({
          where: {
            studentId_year_month: {
              studentId: s.id,
              year,
              month,
            },
          },
        });

        if (existing) {
          skipped.push({
            studentId: s.studentId,
            firstName: s.firstName,
            lastName: s.lastName,
            reason: `Already invoiced for ${month}/${year}`,
          });
          continue;
        }

        await tx.studentMonthlyInvoice.create({
          data: {
            studentId: s.id,
            year,
            month,
            amount,
            note,
            createdById: auth.userId,
          },
        });

        await tx.student.update({
          where: { id: s.id },
          data: { balance: { increment: amount } },
        });

        charged.push({
          studentId: s.studentId,
          firstName: s.firstName,
          lastName: s.lastName,
          amount,
        });
      }
    });

    return NextResponse.json({
      year,
      month,
      chargedCount: charged.length,
      skippedCount: skipped.length,
      charged,
      skipped,
    });
  } catch (e) {
    console.error("Monthly invoice error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}


import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

const escape = (val: any) => {
    if (val === null || val === undefined) return 'NULL';
    if (typeof val === 'number') return val;
    if (typeof val === 'boolean') return val ? 1 : 0;
    if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`; // YYYY-MM-DD HH:mm:ss
    // String escaping for SQL
    return `'${String(val).replace(/'/g, "''").replace(/\\/g, "\\\\")}'`;
};

async function main() {
    const ws = fs.createWriteStream('data_dump.sql');

    ws.write(`-- Data Dump created by Custom Script\n`);
    ws.write(`SET FOREIGN_KEY_CHECKS=0;\n\n`);

    // 1. Workspace
    const workspaces = await prisma.workspace.findMany();
    for (const row of workspaces) {
        ws.write(`INSERT INTO Workspace (id, name, ownerId, createdAt) VALUES (${row.id}, ${escape(row.name)}, ${escape(row.ownerId)}, ${escape(row.createdAt)});\n`);
    }
    ws.write('\n');

    // 2. Member
    const members = await prisma.member.findMany();
    for (const row of members) {
        // Need to handle nulls
        ws.write(`INSERT INTO Member (id, name, email, username, password, role, workspaceId) VALUES (${row.id}, ${escape(row.name)}, ${escape(row.email)}, ${escape(row.username)}, ${escape(row.password)}, ${escape(row.role)}, ${row.workspaceId});\n`);
    }
    ws.write('\n');

    // 3. Sheet
    const sheets = await prisma.sheet.findMany();
    for (const row of sheets) {
        ws.write(`INSERT INTO Sheet (id, name, month, year, status, createdAt, workspaceId) VALUES (${row.id}, ${escape(row.name)}, ${row.month}, ${row.year}, ${escape(row.status)}, ${escape(row.createdAt)}, ${row.workspaceId});\n`);
    }
    ws.write('\n');

    // 4. Expense
    const expenses = await prisma.expense.findMany();
    for (const row of expenses) {
        ws.write(`INSERT INTO Expense (id, description, amount, type, date, sheetId, payerId) VALUES (${row.id}, ${escape(row.description)}, ${row.amount}, ${escape(row.type)}, ${escape(row.date)}, ${row.sheetId}, ${row.payerId});\n`);
    }
    ws.write('\n');

    // 5. Split
    const splits = await prisma.split.findMany();
    for (const row of splits) {
        ws.write(`INSERT INTO Split (id, amount, expenseId, memberId) VALUES (${row.id}, ${row.amount}, ${row.expenseId}, ${row.memberId});\n`);
    }
    ws.write('\n');

    ws.write(`SET FOREIGN_KEY_CHECKS=1;\n`);
    ws.end();

    console.log('Dump completed to data_dump.sql');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });

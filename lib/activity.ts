import { prisma } from "@/lib/prisma";
import type { TaskActivityType } from "@/generated/prisma";

type Actor = {
    id: number;
    name: string;
};

export async function logTaskActivity({
    taskId,
    actor,
    type,
    field,
    fromValue,
    toValue,
}: {
    taskId: number;
    actor: Actor;
    type: TaskActivityType;
    field?: string;
    fromValue?: unknown;
    toValue?: unknown;
}) {
    await prisma.taskActivity.create({
        data: {
            taskId,
            actorId: actor.id,
            actorName: actor.name,
            type,
            field,
            fromValue: fromValue == null ? null : String(fromValue),
            toValue: toValue == null ? null : String(toValue),
        },
    });
}

export async function nextIssueKey(projectId: number) {
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { key: true, name: true },
    });
    const prefix = project?.key || (project?.name ?? "PRJ").replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "PRJ";
    const count = await prisma.task.count({ where: { projectId } });
    return `${prefix}-${count + 1}`;
}

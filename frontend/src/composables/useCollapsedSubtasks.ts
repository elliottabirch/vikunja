import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import {useStorage} from '@vueuse/core'

// Structural type so both the generated Task and the normalized TaskResponse fit.
type TaskWithSubtasks = {
	id?: number,
	related_tasks?: {[key: string]: readonly unknown[] | null | undefined},
}

type TaskId = NonNullable<TaskWithSubtasks['id']>

// Subtasks start collapsed, so the list opens as a short top level to drill down from.
// Persist the expanded state across reloads. Only expanded tasks are kept so the entry
// does not grow with every task that was ever collapsed again.
type ExpandedTasks = {[key: TaskId]: true}

const expandedTasks = useStorage<ExpandedTasks>('expandedSubtasks', {})

function isCollapsed(taskId: TaskId) {
	return expandedTasks.value[taskId] !== true
}

function setCollapsed(taskId: TaskId, collapsed: boolean) {
	if (collapsed) {
		delete expandedTasks.value[taskId]
		return
	}

	expandedTasks.value[taskId] = true
}

export function useSubtasksCollapsed(taskId: MaybeRefOrGetter<TaskId | undefined>) {
	return computed({
		get: () => {
			const id = toValue(taskId)
			return id !== undefined && isCollapsed(id)
		},
		set: (collapsed: boolean) => {
			const id = toValue(taskId)
			if (id !== undefined) {
				setCollapsed(id, collapsed)
			}
		},
	})
}

export function useCollapseAllSubtasks(tasks: MaybeRefOrGetter<readonly TaskWithSubtasks[]>) {
	const tasksWithSubtasks = computed(() => toValue(tasks)
		.filter((t): t is TaskWithSubtasks & {id: TaskId} => t.id !== undefined && (t.related_tasks?.subtask?.length ?? 0) > 0))

	const hasTasksWithSubtasks = computed(() => tasksWithSubtasks.value.length > 0)
	const allCollapsed = computed(() => hasTasksWithSubtasks.value &&
		tasksWithSubtasks.value.every(t => isCollapsed(t.id)))

	function toggleAll() {
		const collapse = !allCollapsed.value
		tasksWithSubtasks.value.forEach(t => setCollapsed(t.id, collapse))
	}

	return {
		allCollapsed,
		hasTasksWithSubtasks,
		toggleAll,
	}
}

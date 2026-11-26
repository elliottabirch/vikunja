import {computed, toValue, type MaybeRefOrGetter} from 'vue'
import {useStorage} from '@vueuse/core'

// Structural type so both the generated Task and the normalized TaskResponse fit.
type TaskWithSubtasks = {
	id?: number,
	related_tasks?: {[key: string]: readonly unknown[] | null | undefined},
}

type TaskId = NonNullable<TaskWithSubtasks['id']>

// Persist the collapsed state across reloads. Only collapsed tasks are kept so the entry
// does not grow with every task that was ever expanded.
type CollapsedTasks = {[key: TaskId]: true}

const collapsedTasks = useStorage<CollapsedTasks>('collapsedSubtasks', {})

function setCollapsed(taskId: TaskId, collapsed: boolean) {
	if (collapsed) {
		collapsedTasks.value[taskId] = true
		return
	}

	delete collapsedTasks.value[taskId]
}

export function useSubtasksCollapsed(taskId: MaybeRefOrGetter<TaskId | undefined>) {
	return computed({
		get: () => {
			const id = toValue(taskId)
			return id !== undefined && collapsedTasks.value[id] === true
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
		tasksWithSubtasks.value.every(t => collapsedTasks.value[t.id] === true))

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

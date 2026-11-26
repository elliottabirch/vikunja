import {beforeEach, describe, expect, it, vi} from 'vitest'

const STORAGE_KEY = 'expandedSubtasks'

// The storage ref lives at module level, so every test gets a fresh module and an empty storage.
async function load() {
	vi.resetModules()
	return import('./useCollapsedSubtasks')
}

function parent(id: number) {
	return {id, related_tasks: {subtask: [{id: id + 100}]}}
}

describe('useCollapsedSubtasks', () => {
	beforeEach(() => {
		localStorage.clear()
	})

	it('starts collapsed', async () => {
		const {useSubtasksCollapsed, useCollapseAllSubtasks} = await load()

		expect(useSubtasksCollapsed(1).value).toBe(true)
		expect(useSubtasksCollapsed(undefined).value).toBe(false)
		expect(useCollapseAllSubtasks([parent(1), parent(2)]).allCollapsed.value).toBe(true)
	})

	it('expands and collapses a single task', async () => {
		const {useSubtasksCollapsed} = await load()
		const first = useSubtasksCollapsed(1)
		const second = useSubtasksCollapsed(2)

		first.value = false
		expect(first.value).toBe(false)
		expect(second.value).toBe(true)

		first.value = true
		expect(first.value).toBe(true)
	})

	it('expands all and collapses all with toggleAll', async () => {
		const {useSubtasksCollapsed, useCollapseAllSubtasks} = await load()
		const tasks = [parent(1), parent(2), {id: 3}]
		const {allCollapsed, toggleAll} = useCollapseAllSubtasks(tasks)

		toggleAll()
		expect(allCollapsed.value).toBe(false)
		expect(useSubtasksCollapsed(1).value).toBe(false)
		expect(useSubtasksCollapsed(2).value).toBe(false)

		toggleAll()
		expect(allCollapsed.value).toBe(true)
		expect(useSubtasksCollapsed(1).value).toBe(true)
		expect(useSubtasksCollapsed(2).value).toBe(true)
	})

	it('collapses all when only some tasks are expanded', async () => {
		const {useSubtasksCollapsed, useCollapseAllSubtasks} = await load()
		const {allCollapsed, toggleAll} = useCollapseAllSubtasks([parent(1), parent(2)])

		useSubtasksCollapsed(1).value = false
		expect(allCollapsed.value).toBe(false)

		toggleAll()
		expect(allCollapsed.value).toBe(true)
	})

	it('is not collapsed-all without any task with subtasks', async () => {
		const {useCollapseAllSubtasks} = await load()
		const {allCollapsed, hasTasksWithSubtasks} = useCollapseAllSubtasks([{id: 1}])

		expect(hasTasksWithSubtasks.value).toBe(false)
		expect(allCollapsed.value).toBe(false)
	})

	it('stores only expanded ids under expandedSubtasks and ignores the old key', async () => {
		localStorage.setItem('collapsedSubtasks', JSON.stringify({1: true}))
		const {useSubtasksCollapsed} = await load()
		const first = useSubtasksCollapsed(1)
		const second = useSubtasksCollapsed(2)

		// the old key is not read
		expect(first.value).toBe(true)

		first.value = false
		second.value = false
		await vi.waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({1: true, 2: true}))

		first.value = true
		await vi.waitFor(() => expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')).toEqual({2: true}))

		// the old key is not written
		expect(JSON.parse(localStorage.getItem('collapsedSubtasks') ?? '{}')).toEqual({1: true})
	})
})

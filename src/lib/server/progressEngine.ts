import { getCollectionItems, updateCollectionItem } from './db';

export interface ProjectProgressResult {
  projectId: string;
  totalTasks: number;
  completedTasks: number;
  calculatedProgress: number;
  updated: boolean;
}

/**
 * Recalculates a project's progress percentage 100% automatically
 * based on completed tasks (and sjekklister if applicable).
 * 
 * Formula: (completedTasks / totalTasks) * 100
 */
export async function recalculateProjectProgress(projectId: string): Promise<ProjectProgressResult> {
  if (!projectId) {
    return { projectId, totalTasks: 0, completedTasks: 0, calculatedProgress: 0, updated: false };
  }

  try {
    const [allTasks, allProjects] = await Promise.all([
      getCollectionItems('tasks').catch(() => []),
      getCollectionItems('projects').catch(() => [])
    ]);

    const targetProject = allProjects.find((p: any) => p.id === projectId);
    const projectTasks = allTasks.filter((t: any) => t.projectId === projectId);

    const totalTasks = projectTasks.length;
    const completedTasks = projectTasks.filter((t: any) => t.status === 'completed').length;

    let calculatedProgress = targetProject?.progress || 0;

    if (totalTasks > 0) {
      calculatedProgress = Math.min(100, Math.max(0, Math.round((completedTasks / totalTasks) * 100)));
    }

    // Only update if progress actually changed or to ensure synchronization
    if (targetProject && targetProject.progress !== calculatedProgress) {
      await updateCollectionItem('projects', projectId, {
        ...targetProject,
        progress: calculatedProgress,
        lastUpdate: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return { projectId, totalTasks, completedTasks, calculatedProgress, updated: true };
    }

    return { projectId, totalTasks, completedTasks, calculatedProgress, updated: false };
  } catch (error) {
    console.warn('[progressEngine] Failed to recalculate progress for project:', projectId, error);
    return { projectId, totalTasks: 0, completedTasks: 0, calculatedProgress: 0, updated: false };
  }
}

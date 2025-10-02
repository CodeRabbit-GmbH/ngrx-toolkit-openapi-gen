import { test, expect } from '@playwright/test';

test.describe('Task Manager', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('[data-testid="task-list"]', { timeout: 10000 });
  });

  test('should display tasks', async ({ page }) => {
    const taskList = page.locator('[data-testid="task-list"]');
    await expect(taskList).toBeVisible();
    
    const taskItems = taskList.locator('.entity-item');
    const count = await taskItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should create a new task', async ({ page }) => {
    const taskList = page.locator('[data-testid="task-list"]');
    const initialCount = await taskList.locator('.entity-item').count();
    
    const input = page.locator('[data-testid="new-task-input"]');
    const addButton = page.locator('[data-testid="add-task-button"]');
    
    const taskName = `Test Task ${Date.now()}`;
    await input.fill(taskName);
    await addButton.click();
    
    // Wait for the new task to appear
    await expect(page.locator('.task-title', { hasText: taskName })).toBeVisible({ timeout: 5000 });
    
    // Verify count increased
    const newCount = await taskList.locator('.entity-item').count();
    expect(newCount).toBe(initialCount + 1);
  });

  test('should update task status', async ({ page }) => {
    // Wait for tasks to load
    await page.waitForSelector('[data-testid^="task-status-"]');
    
    const firstTaskStatus = page.locator('[data-testid^="task-status-"]').first();
    const currentValue = await firstTaskStatus.inputValue();
    const newValue = currentValue === 'completed' ? 'pending' : 'completed';
    
    await firstTaskStatus.selectOption(newValue);
    await page.waitForTimeout(500);
    
    await expect(firstTaskStatus).toHaveValue(newValue);
  });

  test('should delete a task', async ({ page }) => {
    const taskList = page.locator('[data-testid="task-list"]');
    const initialCount = await taskList.locator('.entity-item').count();
    expect(initialCount).toBeGreaterThan(0);
    
    const deleteButton = taskList.locator('.delete-btn').first();
    await deleteButton.click();
    
    await page.waitForTimeout(500);
    
    const finalCount = await taskList.locator('.entity-item').count();
    expect(finalCount).toBe(initialCount - 1);
  });
});

test.describe('Project Manager', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="nav-projects"]');
    await page.waitForSelector('[data-testid="project-list"]', { timeout: 10000 });
  });

  test('should display projects', async ({ page }) => {
    const projectList = page.locator('[data-testid="project-list"]');
    await expect(projectList).toBeVisible();
    
    const projectItems = projectList.locator('.entity-item');
    const count = await projectItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should create a new project', async ({ page }) => {
    const projectList = page.locator('[data-testid="project-list"]');
    const initialCount = await projectList.locator('.entity-item').count();
    
    const input = page.locator('[data-testid="new-project-input"]');
    const addButton = page.locator('[data-testid="add-project-button"]');
    
    const projectName = `Test Project ${Date.now()}`;
    await input.fill(projectName);
    await addButton.click();
    
    // Wait for the new project to appear
    await expect(page.locator('.project-name', { hasText: projectName })).toBeVisible({ timeout: 5000 });
    
    // Verify count increased
    const newCount = await projectList.locator('.entity-item').count();
    expect(newCount).toBe(initialCount + 1);
  });

  test('should update project status', async ({ page }) => {
    await page.waitForSelector('[data-testid^="project-status-"]');
    
    const firstProjectStatus = page.locator('[data-testid^="project-status-"]').first();
    const currentValue = await firstProjectStatus.inputValue();
    const newValue = currentValue === 'archived' ? 'active' : 'archived';
    
    await firstProjectStatus.selectOption(newValue);
    await page.waitForTimeout(500);
    
    await expect(firstProjectStatus).toHaveValue(newValue);
  });

  test('should delete a project', async ({ page }) => {
    const projectList = page.locator('[data-testid="project-list"]');
    const initialCount = await projectList.locator('.entity-item').count();
    expect(initialCount).toBeGreaterThan(0);
    
    const deleteButton = projectList.locator('.delete-btn').first();
    await deleteButton.click();
    
    await page.waitForTimeout(500);
    
    const finalCount = await projectList.locator('.entity-item').count();
    expect(finalCount).toBe(initialCount - 1);
  });
});

test.describe('User Manager', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('[data-testid="nav-users"]');
    await page.waitForSelector('[data-testid="user-list"]', { timeout: 10000 });
  });

  test('should display users', async ({ page }) => {
    const userList = page.locator('[data-testid="user-list"]');
    await expect(userList).toBeVisible();
    
    const userItems = userList.locator('.entity-item');
    const count = await userItems.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should create a new user', async ({ page }) => {
    const userList = page.locator('[data-testid="user-list"]');
    const initialCount = await userList.locator('.entity-item').count();
    
    const nameInput = page.locator('[data-testid="new-user-name-input"]');
    const emailInput = page.locator('[data-testid="new-user-email-input"]');
    const addButton = page.locator('[data-testid="add-user-button"]');
    
    const userName = `John Doe ${Date.now()}`;
    const userEmail = `john${Date.now()}@example.com`;
    await nameInput.fill(userName);
    await emailInput.fill(userEmail);
    await addButton.click();
    
    // Wait for the new user to appear
    await expect(page.locator('.user-name', { hasText: userName })).toBeVisible({ timeout: 5000 });
    
    // Verify count increased
    const newCount = await userList.locator('.entity-item').count();
    expect(newCount).toBe(initialCount + 1);
  });

  test('should update user role', async ({ page }) => {
    await page.waitForSelector('[data-testid^="user-role-"]');
    
    const firstUserRole = page.locator('[data-testid^="user-role-"]').first();
    const currentValue = await firstUserRole.inputValue();
    const newValue = currentValue === 'viewer' ? 'admin' : 'viewer';
    
    await firstUserRole.selectOption(newValue);
    await page.waitForTimeout(500);
    
    await expect(firstUserRole).toHaveValue(newValue);
  });

  test('should delete a user', async ({ page }) => {
    const userList = page.locator('[data-testid="user-list"]');
    const initialCount = await userList.locator('.entity-item').count();
    expect(initialCount).toBeGreaterThan(0);
    
    const deleteButton = userList.locator('.delete-btn').first();
    await deleteButton.click();
    
    await page.waitForTimeout(500);
    
    const finalCount = await userList.locator('.entity-item').count();
    expect(finalCount).toBe(initialCount - 1);
  });
});

test.describe('Navigation', () => {
  test('should navigate between all tabs', async ({ page }) => {
    await page.goto('/');
    
    // Start on Tasks
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible({ timeout: 10000 });
    
    // Go to Projects
    await page.click('[data-testid="nav-projects"]');
    await expect(page.locator('[data-testid="project-list"]')).toBeVisible({ timeout: 5000 });
    
    // Go to Users
    await page.click('[data-testid="nav-users"]');
    await expect(page.locator('[data-testid="user-list"]')).toBeVisible({ timeout: 5000 });
    
    // Back to Tasks
    await page.click('[data-testid="nav-tasks"]');
    await expect(page.locator('[data-testid="task-list"]')).toBeVisible({ timeout: 5000 });
  });
});

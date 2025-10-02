import { http, HttpResponse, delay } from 'msw';

// Types for mock data - Tasks API only
interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  projectId?: string;
  assigneeId?: string;
  createdAt: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: string;
  ownerId?: string;
  createdAt: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatarUrl?: string;
  createdAt: string;
}

// In-memory data stores - Tasks API only
let tasks: Task[] = [
  { id: '1', title: 'Setup project', description: 'Initialize the project structure', status: 'completed', projectId: '1', assigneeId: '1', createdAt: new Date().toISOString() },
  { id: '2', title: 'Add authentication', description: 'Implement user auth flow', status: 'in_progress', projectId: '1', assigneeId: '2', createdAt: new Date().toISOString() },
  { id: '3', title: 'Write tests', description: 'Add unit and e2e tests', status: 'pending', projectId: '2', assigneeId: '1', createdAt: new Date().toISOString() },
];

let projects: Project[] = [
  { id: '1', name: 'Web App', description: 'Main web application', status: 'active', ownerId: '1', createdAt: new Date().toISOString() },
  { id: '2', name: 'Mobile App', description: 'iOS and Android app', status: 'draft', ownerId: '2', createdAt: new Date().toISOString() },
  { id: '3', name: 'API Backend', description: 'REST API services', status: 'active', ownerId: '1', createdAt: new Date().toISOString() },
];

let users: User[] = [
  { id: '1', email: 'alice@example.com', name: 'Alice Johnson', role: 'admin', avatarUrl: 'https://i.pravatar.cc/150?u=alice', createdAt: new Date().toISOString() },
  { id: '2', email: 'bob@example.com', name: 'Bob Smith', role: 'member', avatarUrl: 'https://i.pravatar.cc/150?u=bob', createdAt: new Date().toISOString() },
  { id: '3', email: 'carol@example.com', name: 'Carol White', role: 'viewer', avatarUrl: 'https://i.pravatar.cc/150?u=carol', createdAt: new Date().toISOString() },
];

let nextTaskId = 4;
let nextProjectId = 4;
let nextUserId = 4;

export const handlers = [
  // ==================== TASKS ====================
  http.get('/api/tasks', async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const projectId = url.searchParams.get('projectId');
    const limit = url.searchParams.get('limit');

    let result = [...tasks];
    if (status) {
      result = result.filter(t => t.status === status);
    }
    if (projectId) {
      result = result.filter(t => t.projectId === projectId);
    }
    if (limit) {
      result = result.slice(0, parseInt(limit, 10));
    }
    return HttpResponse.json(result);
  }),

  http.get('/api/tasks/:id', async ({ params }) => {
    await delay(50);
    const id = params['id'] as string;
    const task = tasks.find(t => t.id === id);
    if (!task) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(task);
  }),

  http.post('/api/tasks', async ({ request }) => {
    await delay(100);
    const body = await request.json() as Task;
    const newTask: Task = {
      id: String(nextTaskId++),
      title: body.title,
      description: body.description || '',
      status: body.status || 'pending',
      projectId: body.projectId,
      assigneeId: body.assigneeId,
      createdAt: new Date().toISOString(),
    };
    tasks.push(newTask);
    return HttpResponse.json(newTask, { status: 201 });
  }),

  http.put('/api/tasks/:id', async ({ params, request }) => {
    await delay(100);
    const id = params['id'] as string;
    const body = await request.json() as Partial<Task>;
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    tasks[index] = { ...tasks[index], ...body };
    return HttpResponse.json(tasks[index]);
  }),

  http.delete('/api/tasks/:id', async ({ params }) => {
    await delay(100);
    const id = params['id'] as string;
    const index = tasks.findIndex(t => t.id === id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    tasks.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ==================== PROJECTS ====================
  http.get('/api/projects', async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    let result = [...projects];
    if (status) {
      result = result.filter(p => p.status === status);
    }
    return HttpResponse.json(result);
  }),

  http.get('/api/projects/:id', async ({ params }) => {
    await delay(50);
    const id = params['id'] as string;
    const project = projects.find(p => p.id === id);
    if (!project) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(project);
  }),

  http.post('/api/projects', async ({ request }) => {
    await delay(100);
    const body = await request.json() as Project;
    const newProject: Project = {
      id: String(nextProjectId++),
      name: body.name,
      description: body.description || '',
      status: body.status || 'draft',
      ownerId: body.ownerId,
      createdAt: new Date().toISOString(),
    };
    projects.push(newProject);
    return HttpResponse.json(newProject, { status: 201 });
  }),

  http.put('/api/projects/:id', async ({ params, request }) => {
    await delay(100);
    const id = params['id'] as string;
    const body = await request.json() as Partial<Project>;
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    projects[index] = { ...projects[index], ...body };
    return HttpResponse.json(projects[index]);
  }),

  http.delete('/api/projects/:id', async ({ params }) => {
    await delay(100);
    const id = params['id'] as string;
    const index = projects.findIndex(p => p.id === id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    projects.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),

  // ==================== USERS ====================
  http.get('/api/users', async ({ request }) => {
    await delay(100);
    const url = new URL(request.url);
    const role = url.searchParams.get('role');

    let result = [...users];
    if (role) {
      result = result.filter(u => u.role === role);
    }
    return HttpResponse.json(result);
  }),

  http.get('/api/users/:id', async ({ params }) => {
    await delay(50);
    const id = params['id'] as string;
    const user = users.find(u => u.id === id);
    if (!user) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  http.post('/api/users', async ({ request }) => {
    await delay(100);
    const body = await request.json() as User;
    const newUser: User = {
      id: String(nextUserId++),
      email: body.email,
      name: body.name,
      role: body.role || 'member',
      avatarUrl: body.avatarUrl,
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    return HttpResponse.json(newUser, { status: 201 });
  }),

  http.put('/api/users/:id', async ({ params, request }) => {
    await delay(100);
    const id = params['id'] as string;
    const body = await request.json() as Partial<User>;
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    users[index] = { ...users[index], ...body };
    return HttpResponse.json(users[index]);
  }),

  http.delete('/api/users/:id', async ({ params }) => {
    await delay(100);
    const id = params['id'] as string;
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
      return new HttpResponse(null, { status: 404 });
    }
    users.splice(index, 1);
    return new HttpResponse(null, { status: 204 });
  }),
];

// Helper to reset data for tests
export function resetMockData() {
  tasks = [
    { id: '1', title: 'Setup project', description: 'Initialize the project structure', status: 'completed', projectId: '1', assigneeId: '1', createdAt: new Date().toISOString() },
    { id: '2', title: 'Add authentication', description: 'Implement user auth flow', status: 'in_progress', projectId: '1', assigneeId: '2', createdAt: new Date().toISOString() },
    { id: '3', title: 'Write tests', description: 'Add unit and e2e tests', status: 'pending', projectId: '2', assigneeId: '1', createdAt: new Date().toISOString() },
  ];
  projects = [
    { id: '1', name: 'Web App', description: 'Main web application', status: 'active', ownerId: '1', createdAt: new Date().toISOString() },
    { id: '2', name: 'Mobile App', description: 'iOS and Android app', status: 'draft', ownerId: '2', createdAt: new Date().toISOString() },
    { id: '3', name: 'API Backend', description: 'REST API services', status: 'active', ownerId: '1', createdAt: new Date().toISOString() },
  ];
  users = [
    { id: '1', email: 'alice@example.com', name: 'Alice Johnson', role: 'admin', avatarUrl: 'https://i.pravatar.cc/150?u=alice', createdAt: new Date().toISOString() },
    { id: '2', email: 'bob@example.com', name: 'Bob Smith', role: 'member', avatarUrl: 'https://i.pravatar.cc/150?u=bob', createdAt: new Date().toISOString() },
    { id: '3', email: 'carol@example.com', name: 'Carol White', role: 'viewer', avatarUrl: 'https://i.pravatar.cc/150?u=carol', createdAt: new Date().toISOString() },
  ];
  nextTaskId = 4;
  nextProjectId = 4;
  nextUserId = 4;
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, query, where } from 'firebase/firestore';
import { Platform } from 'react-native';
import { db } from '../../config/firebase.config';

const TASKS_STORAGE_KEY = '@tasks';
const DEVICE_ID_KEY = '@device_id';

export interface Task {
  id: string;
  title: string;
  createdAt: Date;
  deviceId: string;
}

const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
};

const getDeviceId = async (): Promise<string> => {
  try {
    let deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    
    if (!deviceId) {
      if (Platform.OS === 'ios') {
        deviceId = await Application.getIosIdForVendorAsync();
      } else {
        deviceId = Application.getAndroidId();
      }

      if (!deviceId) {
        deviceId = generateUniqueId();
      }

      await AsyncStorage.setItem(DEVICE_ID_KEY, deviceId);
    }

    return deviceId;
  } catch (error) {
    console.error('Erro ao obter/gerar ID do dispositivo:', error);
    return generateUniqueId();
  }
};

export const subscribeToTasks = async (onTasksUpdate: (tasks: Task[]) => void) => {
  const deviceId = await getDeviceId();
  
  return onSnapshot(
    query(
      collection(db, 'tasks'),
      where('deviceId', '==', deviceId)
    ),
    async (snapshot) => {
      const taskList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate() 
      })) as Task[];
      
      await saveLocalTasks(taskList);
      onTasksUpdate(taskList);
    }
  );
};

export const createTask = async (title: string) => {
  if (title.trim() === '') throw new Error('Título da tarefa não pode estar vazio');
  
  const deviceId = await getDeviceId();
  
  const newTask = await addDoc(collection(db, 'tasks'), {
    title,
    createdAt: new Date(),
    deviceId
  });

  return newTask;
};

export const deleteTask = async (taskId: string) => {
  return await deleteDoc(doc(db, 'tasks', taskId));
};

export const getLocalTasks = async (): Promise<Task[]> => {
  try {
    const tasksJson = await AsyncStorage.getItem(TASKS_STORAGE_KEY);
    if (tasksJson) {
      const tasks = JSON.parse(tasksJson);
      return tasks.map((task: any) => ({
        ...task,
        createdAt: new Date(task.createdAt)
      }));
    }
    return [];
  } catch (error) {
    console.error('Erro ao carregar tarefas locais:', error);
    return [];
  }
};

export const saveLocalTasks = async (tasks: Task[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    console.error('Erro ao salvar tarefas localmente:', error);
  }
};

export const syncTasks = async () => {
  try {
    const deviceId = await getDeviceId();
    const localTasks = await getLocalTasks();
    
    const querySnapshot = await getDocs(
      query(
        collection(db, 'tasks'),
        where('deviceId', '==', deviceId)
      )
    );
    const remoteTasks = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt.toDate()
    })) as Task[];

    const tasksToUpload = localTasks.filter(localTask => 
      !remoteTasks.some(remoteTask => remoteTask.id === localTask.id)
    );

    for (const task of tasksToUpload) {
      await addDoc(collection(db, 'tasks'), {
        title: task.title,
        createdAt: task.createdAt,
        deviceId
      });
    }

    const tasksToDownload = remoteTasks.filter(remoteTask =>
      !localTasks.some(localTask => localTask.id === remoteTask.id)
    );

    const mergedTasks = [...localTasks, ...tasksToDownload];
    await saveLocalTasks(mergedTasks);

    return mergedTasks;
  } catch (error) {
    console.error('Erro ao sincronizar tarefas:', error);
    throw error;
  }
};
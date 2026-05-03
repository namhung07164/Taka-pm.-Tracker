import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import cron from 'node-cron';
import admin from 'firebase-admin';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };

try {
  admin.initializeApp({
    projectId: firebaseConfig.projectId,
  });
} catch (error) {
  console.error('Firebase Admin initialization failed:', error);
}

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = 3000;

  const runSync = async () => {
    console.log('Starting scheduled sync at', new Date().toISOString());
    try {
      const projectsSnapshot = await db.collectionGroup('taka_projects').get();
      const projects: Record<string, any> = {};
      projectsSnapshot.forEach(doc => {
        const data = doc.data();
        projects[data.code || doc.id] = data;
      });

      const cloudTasks: any[] = [];
      const tasksSnapshot = await db.collectionGroup('taka_tasks').get();
      
      tasksSnapshot.forEach(doc => {
        const data = doc.data();
        const projectCode = data.projectCode;
        const project = projects[projectCode];
        
        if ((project && project.delegation === true) || data.delegation === true || data.isShared === true) {
          cloudTasks.push({
            ...data,
            location: project?.location || '',
            parentTask: project?.name || projectCode || 'Task',
            isDelegated: true,
            refPath: doc.ref.path
          });
        }
      });

      // Try multiple delegations collections
      for (const col of ['delegations', 'taka_delegations', 'custom_delegations', 'delegation_tasks', 'delegated_tasks']) {
         try {
           const snap = await db.collectionGroup(col).get();
           snap.forEach(doc => {
             const data = doc.data();
             cloudTasks.push({
               ...data,
               location: data.location || '',
               parentTask: data.parentName || data.parentTask || projects[data.projectCode]?.name || 'New Custom Delegation',
               isDelegated: true,
               refPath: doc.ref.path
             });
           });
         } catch(e) {}
      }

      for (const task of cloudTasks) {
        if (!task.delegation) {
          await db.doc(task.refPath).update({
            delegation: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          }).catch(() => {});
        }
      }

      const usersSnapshot = await db.collection('tasks').limit(1).get();
      let targetUid: string | null = null;
      if (!usersSnapshot.empty) {
        targetUid = usersSnapshot.docs[0].data().uid;
      }
      
      if (!targetUid) {
        try {
          const userRecord = await admin.auth().getUserByEmail('namhung07164@gmail.com');
          targetUid = userRecord.uid;
        } catch (e) {
          console.error('Could not find user namhung07164@gmail.com');
        }
      }

      if (targetUid) {
        const localTasksSnapshot = await db.collection('tasks').where('uid', '==', targetUid).get();
        const localCodes = new Set(localTasksSnapshot.docs.map(d => d.data().code));

        for (const task of cloudTasks) {
          const taskCode = task.taskCode || task.code || task.id;
          if (!localCodes.has(taskCode)) {
            await db.collection('tasks').add({
              code: taskCode,
              location: task.location || '',
              parentTask: task.parentTask || '',
              projectCode: task.projectCode || '-',
              name: task.name || task.taskName || 'Delegation Task',
              startDate: task.start ? task.start.split('T')[0] : (task.startDate ? task.startDate.split('T')[0] : ''),
              finishDate: task.finish ? task.finish.split('T')[0] : (task.finishDate ? task.finishDate.split('T')[0] : ''),
              uid: targetUid,
              siteUpdateDate: null,
              report: '',
              createdAt: admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Auto-added task: ${taskCode}`);
          }
        }
      }

      console.log('Sync completed successfully.');
    } catch (error) {
      console.error('Scheduled sync failed:', error);
    }
  };

  cron.schedule('0 0 * * *', runSync);

  app.get('/api/sync', async (req, res) => {
    await runSync();
    res.json({ message: 'Sync triggered' });
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

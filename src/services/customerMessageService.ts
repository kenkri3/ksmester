import { db, collection, addDoc, query, where, getDocs, onSnapshot, updateDoc, doc, orderBy } from './firebase';
import { notificationService } from './notificationService';
import { generateAiContent } from './aiClient';
import { Project } from '../types';
import { TeamChatMessage } from '../components/ProjectTeamChat';

export interface CustomerPortalMessage {
  id: string;
  projectId: string;
  projectName?: string;
  clientName: string;
  clientEmail?: string;
  content: string;
  status: 'pending' | 'answered';
  aiSuggestedReply?: string;
  aiDraftStatus?: 'pending_approval' | 'approved' | 'rejected';
  replyContent?: string;
  repliedAt?: string;
  repliedBy?: string;
  createdAt: string;
  channelId?: string;
  messageId?: string;
}

const MESSAGES_COLLECTION = 'project_client_messages';

export const customerMessageService = {
  /**
   * Sender en melding fra kunden i kundeportalen.
   * 1. Lagrer i Firestore `project_client_messages`.
   * 2. Kaller MesterAI i bakgrunnen med prosjektkontekst for å lage et foreslått svar.
   * 3. Lagrer meldingen og MesterAI-utkastet i prosjektets teamchat (med status 'pending_approval').
   * 4. Trigger varsling i backend på bjella via `notificationService`.
   * MERK: Kunden ser INGEN AI-elementer og MesterAI-svaret sendes IKKE før en person godkjenner det.
   */
  async sendCustomerMessage(
    project: Project,
    messageContent: string,
    customerInfo?: { name?: string; email?: string }
  ): Promise<{ success: boolean; messageId: string }> {
    const clientName = customerInfo?.name || project.clientName || 'Kunde';
    const clientEmail = customerInfo?.email || project.clientEmail || '';
    const channelId = `proj_${project.id}`;
    const now = new Date();
    const timestamp = now.toISOString();
    const formattedTime = now.toLocaleTimeString('no-NO', { hour: '2-digit', minute: '2-digit' });
    const localMsgId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // 1. Generer MesterAI-utkast i bakgrunnen basert på prosjektinformasjon
    let aiSuggestedReply = '';
    try {
      const pmName = (project as any).projectManager || (project as any).authorName || 'Byggmester';
      const companyName = project.companyName || (project as any).company || 'Mester Entreprenør AS';
      
      const systemInstruction = `Du er MesterAI, en erfaren norsk byggmester og fagrådgiver for ${companyName}.
Prosjekt: ${project.name}
Lokasjon: ${project.location || project.address || 'Norge'}
Fase: ${project.stage || 'Gjennomføring'}
Fremdrift: ${project.progress || 0}%
Byggeleder: ${pmName}

Oppgave: Kunden har sendt et spørsmål via Kundeportalen. Formuler et høflig, profesjonelt og faglig forankret forslag til svar fra byggelederen.
VIKTIG: Svaret skal godkjennes av en person før sending. Hold svaret ryddig, orienterende og betryggende (1-2 korte avsnitt). Avslutt med en høflig hilsen.`;

      const aiResponse = await generateAiContent({
        prompt: `Kunde (${clientName}) spør:\n"${messageContent.trim()}"\n\nSkriv et forslag til svar fra byggelederen:`,
        systemInstruction,
        isPortal: true,
        operation: 'customer_portal_reply_draft'
      });

      aiSuggestedReply = aiResponse?.text?.trim() || '';
    } catch (aiErr) {
      console.warn('MesterAI kunne ikke generere svarutkast:', aiErr);
      // Fallback høflig utkast
      aiSuggestedReply = `Hei ${clientName}! Takk for henvendelsen vedrørende ${project.name}. Vi har registrert spørsmålet ditt og følger opp dette på byggeplassen. Ta gjerne kontakt dersom du lurer på noe i mellomtiden. Mvh ${project.companyName || 'Mester Entreprenør AS'}`;
    }

    // 2. Lagre i Firestore `project_client_messages`
    let docId = localMsgId;
    try {
      const docRef = await addDoc(collection(db, MESSAGES_COLLECTION), {
        projectId: project.id,
        projectName: project.name,
        clientName,
        clientEmail,
        content: messageContent.trim(),
        status: 'pending',
        aiSuggestedReply,
        aiDraftStatus: 'pending_approval',
        createdAt: timestamp,
        channelId,
        messageId: localMsgId
      });
      if (docRef?.id) docId = docRef.id;
    } catch (dbErr) {
      console.warn('Feil ved lagring i Firestore for kundemelding:', dbErr);
    }

    // 3. Oppdater prosjektets chat-lagring (localStorage for ProjectTeamChat)
    try {
      const tenantScope = (project as any).companyId || (project as any).company?.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'tenant_default';
      
      // Vi oppdaterer både med tenantScope og standard nøkler så ProjectTeamChat finner meldingen uansett
      const storageKeys = [
        `mester_teamchat_${tenantScope}_${channelId}`,
        `mester_teamchat_tenant_default_${channelId}`
      ];

      const newChatMessage: TeamChatMessage = {
        id: localMsgId,
        channelId,
        senderId: `client_${project.id}`,
        senderName: clientName,
        senderRole: 'Oppdragsgiver (Kundeportal)',
        senderCategory: 'client',
        content: messageContent.trim(),
        timestamp,
        formattedTime,
        isCustomerMessage: true,
        customerName: clientName,
        clientEmail,
        aiSuggestedReply,
        aiDraftStatus: 'pending_approval'
      };

      storageKeys.forEach(key => {
        try {
          const raw = localStorage.getItem(key);
          const currentMsgs: TeamChatMessage[] = raw ? JSON.parse(raw) : [];
          // Unngå duplikat
          if (!currentMsgs.some(m => m.id === localMsgId)) {
            currentMsgs.push(newChatMessage);
            localStorage.setItem(key, JSON.stringify(currentMsgs));
          }
        } catch {}
      });

      // Broadcast oppdatering til chat-komponenten
      window.dispatchEvent(new CustomEvent('mester_teamchat_updated', { detail: { channelId } }));
    } catch (storageErr) {
      console.warn('Feil ved oppdatering av lokal chat:', storageErr);
    }

    // 4. Send varsel til backend på bjella (NotificationBell)
    try {
      await notificationService.createNotification({
        userId: 'all',
        title: `Ny melding fra ${clientName} (${project.name})`,
        message: messageContent.length > 90 ? `${messageContent.substring(0, 87)}...` : messageContent,
        type: 'info',
        category: 'chat',
        projectId: project.id,
        projectName: project.name,
        clientName,
        channelId,
        hasAiDraft: Boolean(aiSuggestedReply)
      });
    } catch (notifErr) {
      console.warn('Kunne ikke opprette varsel for kundemelding:', notifErr);
    }

    // 5. Lagre også i `agent_activities` for full revisjonssporbarhet
    try {
      await addDoc(collection(db, 'agent_activities'), {
        type: 'customer_message',
        title: `Melding fra ${clientName}: ${project.name}`,
        description: messageContent.trim(),
        projectId: project.id,
        projectName: project.name,
        clientName,
        clientEmail,
        status: 'pending',
        badge: 'KUNDEHENVENDELSE',
        createdAt: timestamp,
        hasAiDraft: Boolean(aiSuggestedReply)
      });
    } catch {}

    return { success: true, messageId: docId };
  },

  /**
   * Godkjenner og sender svar tilbake til kunden.
   * Kalles fra `ProjectTeamChat` når en håndverker/byggeleder trykker "Godkjenn & Send til kunde".
   */
  async approveAndSendReply(
    projectId: string,
    messageId: string,
    replyContent: string,
    approverUser?: any
  ): Promise<boolean> {
    const now = new Date();
    const timestamp = now.toISOString();
    const approverName = approverUser?.displayName || approverUser?.name || 'Byggeleder';
    const channelId = `proj_${projectId}`;

    try {
      // 1. Finn og oppdater meldingen i `project_client_messages`
      const q = query(
        collection(db, MESSAGES_COLLECTION),
        where('projectId', '==', projectId)
      );
      const snap = await getDocs(q);
      const targetDoc = snap.docs.find(d => {
        const data = d.data();
        return d.id === messageId || data.messageId === messageId;
      });

      if (targetDoc) {
        await updateDoc(doc(db, MESSAGES_COLLECTION, targetDoc.id), {
          status: 'answered',
          aiDraftStatus: 'approved',
          replyContent: replyContent.trim(),
          repliedAt: timestamp,
          repliedBy: approverName
        });
      }

      // 2. Synkroniser inn i chat-lagringen
      const tenantScope = approverUser?.companyId || approverUser?.company?.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() || 'tenant_default';
      const storageKeys = [
        `mester_teamchat_${tenantScope}_${channelId}`,
        `mester_teamchat_tenant_default_${channelId}`
      ];

      storageKeys.forEach(key => {
        try {
          const raw = localStorage.getItem(key);
          if (raw) {
            const msgs: TeamChatMessage[] = JSON.parse(raw);
            const msgToUpdate = msgs.find(m => m.id === messageId);
            if (msgToUpdate) {
              msgToUpdate.aiDraftStatus = 'approved';
            }
            localStorage.setItem(key, JSON.stringify(msgs));
          }
        } catch {}
      });

      // Broadcast oppdatering
      window.dispatchEvent(new CustomEvent('mester_teamchat_updated', { detail: { channelId } }));
      return true;
    } catch (err) {
      console.error('Feil ved godkjenning av svar til kunde:', err);
      return false;
    }
  },

  /**
   * Abonner på meldinger for et gitt prosjekt for sanntidsoppdatering i Kundeportalen.
   */
  subscribeToProjectMessages(
    projectId: string,
    callback: (messages: CustomerPortalMessage[]) => void
  ) {
    const q = query(
      collection(db, MESSAGES_COLLECTION),
      where('projectId', '==', projectId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map(d => ({
          id: d.id,
          ...d.data()
        })) as CustomerPortalMessage[];
        callback(msgs);
      },
      (error) => {
        console.warn('Kunne ikke laste kundemeldinger:', error);
      }
    );
  }
};

-- The admin page (website/admin.html) reads the chat of a disputed job as evidence.
create policy "chats operator dispute read" on chats for select to authenticated
  using (private.is_operator() and exists (select 1 from disputes d where d.job_id = chats.job_id));
create policy "chat messages operator dispute read" on chat_messages for select to authenticated
  using (private.is_operator() and exists (select 1 from chats c join disputes d on d.job_id = c.job_id where c.id = chat_messages.chat_id));

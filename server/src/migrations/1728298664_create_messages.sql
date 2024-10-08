create table messages (
    id serial primary key,
    uuid uuid not null default uuid_generate_v4(),
    body text not null,
    kind varchar(255) not null,
    chat_id integer not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    foreign key (chat_id) references chats (id)
);

create index messages_uuid_index on chats (uuid);

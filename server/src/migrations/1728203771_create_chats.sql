create table chats (
    id serial primary key,
    uuid uuid not null default uuid_generate_v4(),
    name varchar(255),
    dashboard_id integer not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    foreign key (dashboard_id) references dashboards (id)
);

create index chats_uuid_index on chats (uuid);

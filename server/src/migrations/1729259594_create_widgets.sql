create table widgets (
    id serial primary key,
    uuid uuid not null default uuid_generate_v4(),
    template_name varchar(255) not null,
    input text not null,
    name varchar(255) not null,
    dashboard_id integer not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    foreign key (dashboard_id) references dashboards (id)
);

create index widgets_uuid_index on chats (uuid);

create table widget_runs (
    id serial primary key,
    uuid uuid not null default uuid_generate_v4(),
    input text not null,
    output text not null,
    widget_id integer not null,
    status varchar(255) not null,
    created_at timestamp not null default now(),
    updated_at timestamp not null default now(),
    finished_at timestamp,
    foreign key (widget_id) references widgets (id)
);

create index widget_runs_uuid_index on chats (uuid);

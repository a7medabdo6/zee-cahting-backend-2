export enum Gender {
    notSelected = 'notSelected',
    male = 'male',
    female = 'female',
}

export enum NotificationTypes {
    unknown = -1,
    friendRequest = 0,
}

export enum RoomMessageTypes {
    create = 0,
    join = 1,
    leave = 2,
    normal = 3,
    banned = 4,
    kick = 5,
    becomeOwner = 6,
    becomeAdmin = 7,
    becomeMember = 8,
    removeOwner = 9,
    removeAdmin = 10,
    unbanned = 11,
    removeMember = 12,
}

export enum ReactionsTypes {
    like = 0,
    haha = 1,
    love = 2,
    wow = 3,
    sad = 4,
    angry = 5,
}
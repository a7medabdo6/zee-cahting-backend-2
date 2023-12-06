import { Model } from "mongoose";
import { Block } from "src/block/entities/block";

export async function checkIsUserBlocked(userModel: Model<Block>, userId: string, targetUserId: string): Promise<boolean> {

    const existUser = await userModel.findOne({ $or: [{ ownerId: userId, userId: targetUserId }, { ownerId: targetUserId, userId: userId }] }).select('_id').exec();

    return existUser != null;
}

export const userDataExcludedFields = '-password -fcm';
export const baseUserFields = '_id username picture status color';
export const fullUserFields = '_id username picture color age gender country views status isOnline isHiddenActivity isPrivateLock createdAt';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserService {
  // async  pushUsersDataToFirebase(midnight: boolean) {
  //   for (const user in localUsersInfo) {
  //     const userRef = await db.ref(`Production/users/${user}/`).once("value");
  //     const userData: firebase.IUser = userRef.val();
  //     if (midnight) {
  //       if (
  //         (!userData.logs[beforeYesterday()] ||
  //           !userData.logs[beforeYesterday()].Console) &&
  //         localUsersInfo[user].dates[beforeYesterday()].firstConnexion !== ""
  //       ) {
  //         userData.logs[beforeYesterday()].Console.deviceLogs.firstConnexion =
  //           localUsersInfo[user].dates[beforeYesterday()].firstConnexion;
  //         userData.logs[beforeYesterday()].Console.deviceLogs.lastConnexion =
  //           localUsersInfo[user].dates[beforeYesterday()].lastConnexion;
  //         userData.logs[beforeYesterday()].Console.deviceLogs.totalTime =
  //           localUsersInfo[user].dates[beforeYesterday()].totalTime;
  //       }
  //       delete localUsersInfo[user].dates[beforeYesterday()];
  //       if (localUsersInfo[user].dates[yesterday()].firstConnexion !== "") {
  //         userData.logs[yesterday()].Console.deviceLogs.firstConnexion =
  //           localUsersInfo[user].dates[yesterday()].firstConnexion;
  //         userData.logs[yesterday()].Console.deviceLogs.lastConnexion =
  //           localUsersInfo[user].dates[yesterday()].lastConnexion;
  //         userData.logs[yesterday()].Console.deviceLogs.totalTime =
  //           localUsersInfo[user].dates[yesterday()].totalTime;
  //       }
  //     } else {
  //       if (
  //         localUsersInfo[user].dates[today()] &&
  //         localUsersInfo[user].dates[today()].firstConnexion !== ""
  //       ) {
  //         userData.logs[today()].Console.deviceLogs.firstConnexion =
  //           localUsersInfo[user].dates[today()].firstConnexion;
  //         userData.logs[today()].Console.deviceLogs.lastConnexion =
  //           localUsersInfo[user].dates[today()].lastConnexion;
  //         userData.logs[today()].Console.deviceLogs.totalTime =
  //           localUsersInfo[user].dates[today()].totalTime;
  //       }
  //     }
  //     try {
  //       await userRef.ref.set(userData);
  //     } catch (e) {
  //       console.log(e);
  //     }
  //   }
  // }
}

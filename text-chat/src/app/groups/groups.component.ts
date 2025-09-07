import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Group } from '../models/group.model';
import { LoginAttempt, SessionStorageUser } from '../models/user.model';
import { GroupService } from '../services/group.service';
import { AuthenticationService } from '../services/auth.service';
import { Request } from '../models/request.model';
import { NotificationService } from '../services/notification.service';
import { Report } from '../models/report.model';

declare var bootstrap: any;

@Component({
  selector: 'app-groups',
  imports: [CommonModule, FormsModule],
  templateUrl: './groups.html',
  styleUrl: './groups.css'
})
export class Groups implements OnInit {
  public groups: Group[] = [];
  public allGroups: Group[] = [];
  public filteredAllGroups: any[] = [];
  public adminGroups: Group[] = [];
  public filteredGroups: any[] = [];
  public role: string | null = null;
  public newGroupName: string = '';
  public requests: Request[] = [];
  public currentRequest: Request | null = null;

  public username: string = '';

  public reports: Report[] = [];
  public currentReport: any | null = null;
  public filteredReports: any[] = [];

  public myGroupsCurrentPage: number = 1;
  public allGroupsCurrentPage: number = 1;
  public itemsPerPage: number = 10;

  public paginatedMyGroups: any[] = [];
  public paginatedAllGroups: any[] = [];

  public selectedGroup: any = null;

  constructor(private router: Router, private groupService: GroupService, private auth: AuthenticationService,
    private notificationService: NotificationService
  ) { }

  async ngOnInit(): Promise<void> {
    // Get all groups
    const getAllGroups: Group[] = await this.groupService.getAllGroups();
    this.allGroups = getAllGroups;
    const storedUserString: string | null = localStorage.getItem('Credentials');
    if (storedUserString) {
      var storedUser: SessionStorageUser = JSON.parse(storedUserString);
      this.username = storedUser.username;
      const userInfo: SessionStorageUser | null = await this.auth.getUserInfo(storedUser.username);
      if (userInfo) {
        storedUser = userInfo;
      }
      this.requests = storedUser.requests;
      const foundHighestRole = storedUser.roles.find(role => role == "SuperAdmin");
      if (foundHighestRole) {
        this.role = "SuperAdmin";
        this.groups = getAllGroups;
      }
      else {
        this.groups = storedUser.groups
        const foundSecondHighestRole = storedUser.roles.find(role => role == "GroupAdmin");
        if (foundSecondHighestRole) {
          this.role = "GroupAdmin";
        }
        else {
          this.role = "User";
        }
      }
      this.reports = storedUser.reports;
      this.adminGroups = storedUser.adminGroups;
      this.filterGroups();
      this.filterReports();
      this.updateAllPaginatedLists(); 
    }
    else {
      this.router.navigateByUrl('/login');
    }
  }

  reloadComponent() {
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigateByUrl('/groups');
    });
  }

  public async enterGroup(id: number): Promise<void> {
    const result: boolean = await this.groupService.setCurrentGroup(id);
    if (result) {
      this.router.navigateByUrl('/channels');
      return;
    }
  }

  public async removeGroup(id: number): Promise<void> {
    const result: boolean = await this.groupService.removeGroup(id);
    this.filterGroups();
    this.reloadComponent();
  }

  public async createGroup(): Promise<void> {
    const result: boolean = await this.groupService.createNewGroup(this.newGroupName, this.username,
      this.role!);
    const modalElement = document.getElementById('createGroupModal');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      modal.hide();
    }
    this.reloadComponent();
  }

  public updateCurrentRequest(request: Request): void {
    this.currentRequest = request;
  }

  public updateCurrentReport(report: any):void {
    const newReport: any = {
      "usernameReported": report.usernameReported,
      "userProfilePicture": report.userProfilePicture,
      "adminReport": report.adminReport,
      "adminProfilePicture": report.adminProfilePicture,
      "groupId": report.groupId,
      "groupName": report.groupName
    };
    this.currentReport = newReport;
  }

  public async acceptReport(): Promise<void> {
    if (this.currentReport) {
      const newReport: Report = {
        usernameReported: this.currentReport.usernameReported,
        userProfilePicture: this.currentReport.userProfilePicture,
        adminReport: this.currentReport.adminReport,
        adminProfilePicture: this.currentReport.adminProfilePicture,
        groupId: this.currentReport.groupId,
      };
      const result: boolean = await this.auth.acceptReport(newReport);
      const modalElement = document.getElementById('reviewReportModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
      }
      this.reloadComponent();
    }
  }

  public async rejectRequest(): Promise<void> {
    if (this.currentRequest) {
      const result: boolean = await this.groupService.rejectRequest(this.currentRequest);
      const modalElement = document.getElementById('reviewRequestModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
      }
      this.reloadComponent();
    }
  }

  public async acceptRequest(): Promise<void> {
    if (this.currentRequest) {
      const result: boolean = await this.groupService.acceptRequest(this.currentRequest);
      const modalElement = document.getElementById('reviewRequestModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
      }
      this.reloadComponent();
    }
  }

  public async requestGroup(group: Group): Promise<void> {
    const storedUserString = localStorage.getItem('Credentials');
    if (storedUserString) {
      const storedUser: SessionStorageUser = JSON.parse(storedUserString);
      for (var i: number = 0; i < storedUser.groups.length; i++) {
        if (storedUser.groups[i].id == group.id) {
          this.notificationService.show(`You are already a user of ${group.name}`, "error");
          return;
        }
      }
      const newRequest: Request = {
        username: storedUser.username,
        profilePicture: storedUser.profilePicture,
        groupId: group.id,
        group: group.name
      };
      const result: boolean = await this.groupService.requestGroup(newRequest);
      const modalElement = document.getElementById('groupDetailsModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
      }
      this.reloadComponent();
    }
  }

  private filterReports(): void {
    for (var i: number = 0; i < this.reports.length; i++) {
      const foundGroup = this.allGroups.find(group => group.id == this.reports[i].groupId);
      if (foundGroup) {
        this.filteredReports.push({
          "usernameReported": this.reports[i].usernameReported,
          "userProfilePicture": this.reports[i].userProfilePicture,
          "adminReport": this.reports[i].adminReport,
          "adminProfilePicture": this.reports[i].adminProfilePicture,
          "groupId": this.reports[i].groupId,
          "groupName": foundGroup.name
        });
      }
      else{
        this.filteredReports.push({
          "usernameReported": this.reports[i].usernameReported,
          "userProfilePicture": this.reports[i].userProfilePicture,
          "adminReport": this.reports[i].adminReport,
          "adminProfilePicture": this.reports[i].adminProfilePicture,
          "groupId": this.reports[i].groupId,
          "groupName": "Unknown"
        });
      }
    }
  }

  private filterGroups(): void {
    var permission: string = "GroupAdmin";
    if (this.role == "SuperAdmin") {
      permission = "SuperAdmin";
    }
    for (var i: number = 0; i < this.groups.length; i++) {
      const foundGroup = this.adminGroups.find(group => group.id == this.groups[i].id);
      if (foundGroup) {
        this.filteredGroups.push({ "group": this.groups[i], "permission": permission });
      }
      else {
        if (permission == "SuperAdmin") {
          this.filteredGroups.push({ "group": this.groups[i], "permission": permission });
        }
        else {
          this.filteredGroups.push({ "group": this.groups[i], "permission": "User" });
        }
      }
    }

    for (var i: number = 0; i < this.allGroups.length; i++) {
      const foundGroup = this.adminGroups.find(group => group.id == this.allGroups[i].id);
      if (foundGroup) {
        this.filteredAllGroups.push({ "group": this.allGroups[i], "permission": permission });
      }
      else {
        if (permission == "SuperAdmin") {
          this.filteredAllGroups.push({ "group": this.allGroups[i], "permission": permission });
        }
        else {
          this.filteredAllGroups.push({ "group": this.allGroups[i], "permission": "User" });
        }
      }
    }
  }

  updateAllPaginatedLists(): void {
    this.updatePaginatedMyGroups();
    this.updatePaginatedAllGroups();
  }

  updatePaginatedMyGroups(): void {
    const startIndex = (this.myGroupsCurrentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedMyGroups = this.filteredGroups.slice(startIndex, endIndex);
  }

  changeMyGroupsPage(pageChange: number): void {
    this.myGroupsCurrentPage += pageChange;
    this.updatePaginatedMyGroups();
  }

  getTotalMyGroupsPages(): number {
    return Math.ceil(this.filteredGroups.length / this.itemsPerPage);
  }

  updatePaginatedAllGroups(): void {
    const startIndex = (this.allGroupsCurrentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedAllGroups = this.filteredAllGroups.slice(startIndex, endIndex);
  }
  
  changeAllGroupsPage(pageChange: number): void {
    this.allGroupsCurrentPage += pageChange;
    this.updatePaginatedAllGroups();
  }

  getTotalAllGroupsPages(): number {
    return Math.ceil(this.filteredAllGroups.length / this.itemsPerPage);
  }

  public openGroupDetailsModal(group: any): void {
    const isUserMember = this.groups.some(myGroup => myGroup.id === group.group.id);
    if (isUserMember) {
      this.selectedGroup = { ...group, isMember: true };
    } 
    else {
      this.selectedGroup = { ...group, permission: 'None', isMember: false };
    }
  }
}

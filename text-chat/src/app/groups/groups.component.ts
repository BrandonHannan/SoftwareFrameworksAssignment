import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Group } from '../models/group.model';
import { SessionStorageUser } from '../models/user.model';
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
  // Holds the groups stored in the database
  public groups: Group[] = [];
  public allGroups: Group[] = [];
  public filteredAllGroups: any[] = [];
  public filteredGroups: any[] = [];
  // Holds the new inputted group name if the user is creating a new group
  public newGroupName: string = '';

  // Holds the relevant user information
  public username: string = '';
  public role: string | null = null;
  public reports: Report[] = [];
  public adminGroups: Group[] = [];
  public requests: Request[] = [];

  // Holds the selected report or request
  public currentRequest: Request | null = null;
  public currentReport: any | null = null;
  public filteredReports: any[] = [];

  // Holds the paginated groups and all groups array
  public myGroupsCurrentPage: number = 1;
  public allGroupsCurrentPage: number = 1;
  public itemsPerPage: number = 10;

  // Holds the viewable groups and all groups
  public paginatedMyGroups: any[] = [];
  public paginatedAllGroups: any[] = [];

  public selectedGroup: any = null;

  constructor(private router: Router, private groupService: GroupService, private auth: AuthenticationService,
    private notificationService: NotificationService
  ) { }

  async ngOnInit(): Promise<void> {
    // Gets the all groups in the database
    const getAllGroups: Group[] = await this.groupService.getAllGroups();
    this.allGroups = getAllGroups;
    // Checks if the user is logged in
    const storedUserString: string | null = localStorage.getItem('Credentials');
    if (storedUserString) {
      var storedUser: SessionStorageUser = JSON.parse(storedUserString);
      this.username = storedUser.username;
      const userInfo: SessionStorageUser | null = await this.auth.getUserInfo(storedUser.username);
      if (userInfo) {
        storedUser = userInfo;
      }
      this.requests = storedUser.requests;
      // Determines the highest role of the user to determine the page layout
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
      // Updates the viewable groups and reports shown on the page
      this.filterGroups();
      this.filterReports();
      this.updateAllPaginatedLists(); 
    }
    else {
      this.router.navigateByUrl('/login');
    }
  }

  // Reloads the page
  reloadComponent() {
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigateByUrl('/groups');
    });
  }

  // When a user has selected a group
  public async enterGroup(id: number): Promise<void> {
    const result: boolean = await this.groupService.setCurrentGroup(id);
    if (result) {
      this.router.navigateByUrl('/channels');
      return;
    }
  }

  // When a user has selected to delete a group
  public async removeGroup(id: number): Promise<void> {
    const result: boolean = await this.groupService.removeGroup(id);
    // Refreshes the viewable groups 
    this.filterGroups();
    // Reloads the page
    this.reloadComponent();
  }

  // Creates a new group and closes the modal for creating a new group
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

  // Checks the selected request 
  public updateCurrentRequest(request: Request): void {
    this.currentRequest = request;
  }

  // Checks the selected report
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

  // Accepts the report and closes the modal for reviewing the report
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

  // Rejects the request and closes the modal for reviewing the modal
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

  // Accepts the request and closes the modal for reviewing the modal
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

  // Performs a request to the given group
  public async requestGroup(group: Group): Promise<void> {
    const storedUserString = localStorage.getItem('Credentials');
    if (storedUserString) {
      const storedUser: SessionStorageUser = JSON.parse(storedUserString);
      // Checks if the user already apart of the given group
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
      // Closes the details modal
      const result: boolean = await this.groupService.requestGroup(newRequest);
      const modalElement = document.getElementById('groupDetailsModal');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        modal.hide();
      }
      this.reloadComponent();
    }
  }

  // Filters the viewable reports to have suitable attributes
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

  // Filters the groups that the user is apart of 
  private filterGroups(): void {
    // Determines the level of permission the user has
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

    // Determines the permissions the user has for all the groups in the database
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

  // Updates the paginated groups
  updateAllPaginatedLists(): void {
    this.updatePaginatedMyGroups();
    this.updatePaginatedAllGroups();
  }

  // Slices the viewable groups array
  updatePaginatedMyGroups(): void {
    const startIndex = (this.myGroupsCurrentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedMyGroups = this.filteredGroups.slice(startIndex, endIndex);
  }

  // Changes which page the user has selected
  changeMyGroupsPage(pageChange: number): void {
    this.myGroupsCurrentPage += pageChange;
    this.updatePaginatedMyGroups();
  }

  // Gets the length of the groups
  getTotalMyGroupsPages(): number {
    return Math.ceil(this.filteredGroups.length / this.itemsPerPage);
  }

  // Slices the viewable groups array
  updatePaginatedAllGroups(): void {
    const startIndex = (this.allGroupsCurrentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedAllGroups = this.filteredAllGroups.slice(startIndex, endIndex);
  }
  
  // Changes which page the user has selected
  changeAllGroupsPage(pageChange: number): void {
    this.allGroupsCurrentPage += pageChange;
    this.updatePaginatedAllGroups();
  }

  // Gets the length of the groups
  getTotalAllGroupsPages(): number {
    return Math.ceil(this.filteredAllGroups.length / this.itemsPerPage);
  }

  // Opens up the group details modal
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

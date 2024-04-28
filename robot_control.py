from pyniryo2 import *
import threading
import numpy as np
from scipy.spatial.transform import Rotation
import copy
import time
import kinpy as kp

def orientation_error(desired, current):
    """
    This function calculates a 3-dimensional orientation error vector for use in the
    impedance controller. It does this by computing the delta rotation between the
    inputs and converting that rotation to exponential coordinates (axis-angle
    representation, where the 3d vector is axis * angle).
    See https://en.wikipedia.org/wiki/Axis%E2%80%93angle_representation for more information.
    Optimized function to determine orientation error from matrices
    """
    rc1 = current[0:3, 0]
    rc2 = current[0:3, 1]
    rc3 = current[0:3, 2]
    rd1 = desired[0:3, 0]
    rd2 = desired[0:3, 1]
    rd3 = desired[0:3, 2]

    error = 0.5 * (np.cross(rc1, rd1) + np.cross(rc2, rd2) + np.cross(rc3, rd3))

    return error

def jog_callback(_):
    pass

class ArmRobot(object):
    def __init__(self):
        
        # Gains for the twist computation. These should be between 0 and 1. 0 means no
        # movement, 1 means move the end-effector to the target in one integration step.
        self.k_pos = 0.01
        self.k_ori = 0.01
        # controller rate 
        self.rate = 30
        self.period = 1.0 / self.rate

        # controller variables
        self.pose_cmd = [0.1, 0.0, 0.35, 2.26311838, 1.55682127, 2.26355083]
        self.pose_mutex = threading.Lock()

        

        self.robot = NiryoRobot("169.254.200.200")
        self.robot.arm.calibrate_auto()
        self.robot.arm.move_joints([0,0,0,0,-1.57,0])
        self.robot.arm.set_jog_control(True)

        self.current_pose = np.array(self.robot.arm.get_pose().to_list())

        print(self.current_pose)

    # Main control loop to manipulate the arm with differential IK
    def run_controller(self):

        current_pose = np.array(self.current_pose)
        target_pose = np.array(self.pose_cmd)

        print('current_pose', current_pose)
        print('target_pose', target_pose)

        # calculate spatial error
        twist = np.zeros(6)
        error_pos = target_pose[:3] - current_pose[:3]
        twist[:3] = self.k_pos * error_pos
        error_ori = target_pose[3:] - current_pose[3:]
        twist[3:] = self.k_ori * error_ori  

        print('twist', twist)

        self.robot.arm.jog_pose(twist)

        # time.sleep(self.period)

        # self.current_pose = new_pose.tolist()


        # joints = self.robot.arm.inverse_kinematics([0.2, 0.0, 0.3, 0.0, 1.57, 0.0])

        # if joints is None:
        #     print("No solution found")
        #     return
        

        # print(joints)
        

        # # move the arm
        # self.robot.arm.move_joints(joints)

        # time.sleep(self.period)



        # # get current ee pose
        # current_pose = self.current_pose
        # current_pos = current_pose[:3]
        # current_ori = Rotation.from_euler('xyz', current_pose[3:], degrees=False)

        # # don't execute if no message
        # if self.pose_cmd is None:
        #     return
        


        # # get target ee pose
        # target_pos = self.pose_cmd[:3]
        # target_ori = Rotation.from_euler('xyz', self.pose_cmd[3:], degrees=False)

        # # calculate spatial error
        # twist = np.zeros(6)
        # error_pos = target_pos - current_pos
        # twist[:3] = self.k_pos * error_pos
        # error_ori = orientation_error(target_ori.as_matrix(), current_ori.as_matrix())
        # twist[3:] = self.k_ori * error_ori

        # delta_position = twist[:3]
        # delta_orientation = Rotation.from_rotvec(twist[3:]).as_euler('xyz', degrees=False)
        # delta_pose = np.concatenate((delta_position, delta_orientation))

        # # update current pose
        # new_pose = current_pose + delta_pose
        # self.current_pose = new_pose

        # self.robot.arm.move_pose(new_pose.tolist())

        # # time.sleep(self.period)

    def stop(self):
        self.robot.arm.set_jog_control(False)
        self.robot.arm.set_learning_mode(True)
        self.robot.end()

def main():
    arm = ArmRobot()
    # loop until the user presses Ctrl-C
    try:
        while True:
            arm.run_controller()
    except KeyboardInterrupt:
        arm.stop()

    

if __name__=='__main__':
    main()


cmake_minimum_required(VERSION 2.8.3)
project(headset_teleoperation)

## Find catkin macros and libraries
## if COMPONENTS list like find_package(catkin REQUIRED COMPONENTS xyz)
## is used, also find other catkin packages
find_package(catkin REQUIRED COMPONENTS
  interbotix_xs_msgs
  interbotix_xsarm_control
  rospy
  geometry_msgs
  kdl_parser_py
  message_generation
)

catkin_python_setup()

add_message_files(
  FILES
  Headset.msg
)

generate_messages(
  DEPENDENCIES
  geometry_msgs
)



###################################
## catkin specific configuration ##
###################################
## The catkin_package macro generates cmake config files for your package
## Declare things to be passed to dependent projects
catkin_package(
 CATKIN_DEPENDS 
 interbotix_xs_msgs
 interbotix_xsarm_control
 rospy
 geometry_msgs
 kdl_parser_py
 message_runtime
)





#############
## Install ##
#############

## Mark executable scripts (Python etc.) for installation
## in contrast to setup.py, you can choose the destination
catkin_install_python(PROGRAMS
  scripts/xsarm_pose_control
  scripts/simple_headset_teleop
  scripts/pose_interactive_marker
  scripts/headset_receiver
  scripts/zed_streamer
  DESTINATION ${CATKIN_PACKAGE_BIN_DESTINATION}
)

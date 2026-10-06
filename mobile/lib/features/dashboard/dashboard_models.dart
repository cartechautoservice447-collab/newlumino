class DashboardCourse {
  const DashboardCourse({
    required this.id,
    required this.name,
    required this.description,
    required this.color,
    required this.category,
    required this.updatedAt,
    this.noteCount = 0,
  });

  final String id;
  final String name;
  final String description;
  final String color;
  final String category;
  final DateTime updatedAt;
  final int noteCount;
}

class DashboardNote {
  const DashboardNote({
    required this.id,
    required this.title,
    required this.body,
    required this.courseId,
    required this.updatedAt,
    this.favorite = false,
  });

  final String id;
  final String title;
  final String body;
  final String courseId;
  final DateTime updatedAt;
  final bool favorite;
}

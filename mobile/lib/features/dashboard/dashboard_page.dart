import 'package:flutter/material.dart';

import '../../shared/glass/glass_background.dart';
import '../../shared/glass/glass_surface.dart';
import 'dashboard_models.dart';
import 'today_momentum_card.dart';

class DashboardPage extends StatefulWidget {
  const DashboardPage({super.key});

  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  final _scrollController = ScrollController();
  final _searchController = TextEditingController();

  final List<DashboardNote> _notes = [
    DashboardNote(
      id: 'note-1',
      title: 'Binary Search Trees',
      body: 'Insertion, traversal, balance rules, and common interview patterns.',
      courseId: 'cs',
      updatedAt: DateTime.now().subtract(const Duration(minutes: 18)),
      favorite: true,
    ),
    DashboardNote(
      id: 'note-2',
      title: 'React Rendering',
      body: 'Keep render boundaries narrow and prefer stable state ownership.',
      courseId: 'web',
      updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
    ),
    DashboardNote(
      id: 'note-3',
      title: 'Thermodynamics',
      body: 'Entropy, state functions, and first-law relationships.',
      courseId: 'physics',
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
    DashboardNote(
      id: 'note-4',
      title: 'Linear Algebra',
      body: 'Eigenvalues, eigenvectors, matrix transformations and intuition.',
      courseId: 'math',
      updatedAt: DateTime.now().subtract(const Duration(days: 2)),
    ),
  ];

  final List<DashboardCourse> _courses = [
    DashboardCourse(
      id: 'cs',
      name: 'Computer Science',
      description: 'Algorithms, data structures, and systems.',
      color: 'violet',
      category: 'Engineering',
      noteCount: 8,
      updatedAt: DateTime.now().subtract(const Duration(minutes: 22)),
    ),
    DashboardCourse(
      id: 'web',
      name: 'Web Development',
      description: 'Modern React, TypeScript, and frontend architecture.',
      color: 'sky',
      category: 'Engineering',
      noteCount: 12,
      updatedAt: DateTime.now().subtract(const Duration(hours: 2)),
    ),
    DashboardCourse(
      id: 'physics',
      name: 'Physics',
      description: 'Core mechanics and thermodynamics review.',
      color: 'amber',
      category: 'Science',
      noteCount: 5,
      updatedAt: DateTime.now().subtract(const Duration(days: 1)),
    ),
    DashboardCourse(
      id: 'math',
      name: 'Linear Algebra',
      description: 'Vectors, matrices, eigenvalues, and transformations.',
      color: 'emerald',
      category: 'Mathematics',
      noteCount: 4,
      updatedAt: DateTime.now().subtract(const Duration(days: 2)),
    ),
  ];

  String _selectedCategory = 'all';
  int _todayFocusSeconds = 52 * 60;
  double _dailyGoalHours = 2;

  @override
  void dispose() {
    _scrollController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  String get _name => 'Student';

  String get _greeting {
    final hour = DateTime.now().hour;
    if (hour >= 5 && hour < 12) return 'Good Morning, ' + _name + '!';
    if (hour >= 12 && hour < 17) return 'Good Afternoon, ' + _name + '!';
    if (hour >= 17 && hour < 22) return 'Good Evening, ' + _name + '!';
    return 'Night Owl, ' + _name + '!';
  }

  String get _subtitle {
    final hour = DateTime.now().hour;
    if (hour >= 5 && hour < 12) return 'Ready for your morning study sprint?';
    if (hour >= 12 && hour < 17) return 'Keep your study momentum going strong.';
    if (hour >= 17 && hour < 22) return 'Review your key takeaways and active recall.';
    return 'Late-night deep work and quiet retention.';
  }

  String get _pill {
    final hour = DateTime.now().hour;
    if (hour >= 5 && hour < 12) return 'Morning Sprint ☀️';
    if (hour >= 12 && hour < 17) return 'Deep Focus ⚡';
    if (hour >= 17 && hour < 22) return 'Evening Review 🌙';
    return 'Night Owl 🦉';
  }

  List<DashboardNote> get _recentNotes {
    final notes = [..._notes]..sort((a, b) => b.updatedAt.compareTo(a.updatedAt));
    return notes.take(4).toList(growable: false);
  }

  List<String> get _categories {
    final values = <String>{};
    for (final course in _courses) {
      if (course.category.isNotEmpty) values.add(course.category);
    }
    return ['all', ...values];
  }

  List<DashboardCourse> get _filteredCourses {
    final query = _searchController.text.trim().toLowerCase();
    return _courses.where((course) {
      final matchesSearch = query.isEmpty ||
          course.name.toLowerCase().contains(query) ||
          course.description.toLowerCase().contains(query) ||
          course.category.toLowerCase().contains(query);
      final matchesCategory = _selectedCategory == 'all' || course.category == _selectedCategory;
      return matchesSearch && matchesCategory;
    }).toList(growable: false);
  }

  int get _favoriteNotes => _notes.where((note) => note.favorite).length;

  void _notify(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text(message),
          behavior: SnackBarBehavior.floating,
          backgroundColor: const Color(0xEE171A24),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          margin: const EdgeInsets.fromLTRB(16, 0, 16, 96),
        ),
      );
  }

  void _jumpToCourses() {
    if (!_scrollController.hasClients) return;
    _scrollController.animateTo(
      _scrollController.position.maxScrollExtent,
      duration: const Duration(milliseconds: 480),
      curve: Curves.easeOutCubic,
    );
  }

  void _showCreateCourseSheet() {
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();
    var color = 'sky';

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xF5161822),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (sheetContext) {
        return StatefulBuilder(
          builder: (sheetContext, setSheetState) {
            final inset = MediaQuery.viewInsetsOf(sheetContext);
            return Padding(
              padding: EdgeInsets.fromLTRB(20, 20, 20, 20 + inset.bottom),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Expanded(child: Text('Create Course', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800))),
                      IconButton(onPressed: () => Navigator.pop(sheetContext), icon: const Icon(Icons.close_rounded)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  TextField(controller: nameController, autofocus: true, decoration: const InputDecoration(labelText: 'Course title', hintText: 'e.g. Computer Science')),
                  const SizedBox(height: 12),
                  TextField(controller: descriptionController, minLines: 2, maxLines: 3, decoration: const InputDecoration(labelText: 'Description')),
                  const SizedBox(height: 14),
                  const Text('Accent', style: TextStyle(fontSize: 12, fontWeight: FontWeight.w700, color: Color(0xFF9AA4B8))),
                  const SizedBox(height: 8),
                  Wrap(
                    spacing: 8,
                    children: ['sky', 'violet', 'amber', 'emerald', 'rose', 'cyan'].map((value) {
                      return ChoiceChip(
                        label: Text(value),
                        selected: value == color,
                        onSelected: (_) => setSheetState(() => color = value),
                      );
                    }).toList(),
                  ),
                  const SizedBox(height: 18),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: () {
                        final name = nameController.text.trim();
                        if (name.isEmpty) return;
                        setState(() {
                          _courses.insert(
                            0,
                            DashboardCourse(
                              id: 'course-' + DateTime.now().microsecondsSinceEpoch.toString(),
                              name: name,
                              description: descriptionController.text.trim(),
                              color: color,
                              category: 'Personal',
                              noteCount: 0,
                              updatedAt: DateTime.now(),
                            ),
                          );
                        });
                        Navigator.pop(sheetContext);
                        _notify('Course created locally. Backend connection remains pending.');
                      },
                      icon: const Icon(Icons.add_rounded),
                      label: const Text('Create Course'),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _confirmDelete(DashboardCourse course) {
    showModalBottomSheet<void>(
      context: context,
      backgroundColor: const Color(0xF5161822),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(28))),
      builder: (sheetContext) {
        return SafeArea(
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Delete course?', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
                const SizedBox(height: 8),
                Text('“' + course.name + '” will be removed from this local migration preview.', style: const TextStyle(color: Color(0xFF8A94A8), height: 1.4)),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Expanded(child: OutlinedButton(onPressed: () => Navigator.pop(sheetContext), child: const Text('Cancel'))),
                    const SizedBox(width: 10),
                    Expanded(
                      child: FilledButton(
                        style: FilledButton.styleFrom(backgroundColor: const Color(0xFFD95A6A)),
                        onPressed: () {
                          setState(() => _courses.removeWhere((item) => item.id == course.id));
                          Navigator.pop(sheetContext);
                          _notify('Course deleted locally.');
                        },
                        child: const Text('Delete'),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final goalSeconds = (_dailyGoalHours * 3600).round().clamp(60, 86400).toInt();
    final progressPct = ((goalSeconds == 0 ? 0 : _todayFocusSeconds / goalSeconds) * 100).round().clamp(0, 100).toInt();
    final todayMinutes = _todayFocusSeconds ~/ 60;

    return Scaffold(
      backgroundColor: Colors.transparent,
      body: NewLuminoBackground(
        child: SafeArea(
          child: Stack(
            children: [
              Positioned.fill(
                child: CustomScrollView(
                  controller: _scrollController,
                  physics: const BouncingScrollPhysics(parent: AlwaysScrollableScrollPhysics()),
                  slivers: [
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(14, 14, 14, 136),
                      sliver: SliverList(
                        delegate: SliverChildListDelegate.fixed([
                          _buildHeader(),
                          const SizedBox(height: 16),
                          _buildStats(),
                          const SizedBox(height: 28),
                          _buildFocusCard(progressPct, todayMinutes),
                          const SizedBox(height: 28),
                          _buildContinueStudying(),
                          const SizedBox(height: 34),
                          TodayMomentumCard(notes: _notes, todayFocusSeconds: _todayFocusSeconds, dailyGoalHours: _dailyGoalHours),
                          const SizedBox(height: 28),
                          _buildCourseToolbar(),
                          const SizedBox(height: 20),
                          _buildCourses(),
                        ]),
                      ),
                    ),
                  ],
                ),
              ),
              Align(alignment: Alignment.bottomCenter, child: _buildBottomDock()),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return GlassSurface(
      borderRadius: 32,
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 20),
      child: Row(
        children: [
          _iconButton(icon: Icons.auto_awesome_rounded, onPressed: () => _notify('Study tools drawer is a later migration step.'), tooltip: 'Study tools'),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Flexible(child: Text(_greeting, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 21, fontWeight: FontWeight.w800, letterSpacing: -0.4))),
                    const SizedBox(width: 8),
                    Flexible(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0x183B82F6),
                          borderRadius: BorderRadius.circular(999),
                          border: Border.all(color: const Color(0x423B82F6)),
                        ),
                        child: Text(_pill, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 9.5, fontWeight: FontWeight.w800, color: Color(0xFFA7C0FF))),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(_subtitle, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, color: Color(0xFF929BAE))),
              ],
            ),
          ),
          const SizedBox(width: 8),
          _iconButton(icon: Icons.settings_rounded, onPressed: () => _notify('Settings migration is pending.'), tooltip: 'Settings'),
        ],
      ),
    );
  }

  Widget _iconButton({required IconData icon, required VoidCallback onPressed, required String tooltip}) {
    return Tooltip(
      message: tooltip,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onPressed,
          child: Ink(
            width: 42,
            height: 42,
            decoration: BoxDecoration(
              color: const Color(0x0DFFFFFF),
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: const Color(0x1AFFFFFF)),
            ),
            child: Icon(icon, size: 18, color: const Color(0xFF9199AA)),
          ),
        ),
      ),
    );
  }

  Widget _buildStats() {
    return Row(
      children: [
        Expanded(child: _statCard(Icons.folder_open_rounded, 'COURSES', _courses.length.toString(), const Color(0xFF83A7FF), _jumpToCourses)),
        const SizedBox(width: 8),
        Expanded(child: _statCard(Icons.menu_book_rounded, 'NOTES', _notes.length.toString(), const Color(0xFF83E4D4), () => _notify('Notes list migration is next.'))),
        const SizedBox(width: 8),
        Expanded(child: _statCard(Icons.star_rounded, 'FAVORITES', _favoriteNotes.toString(), const Color(0xFFFFC86B), () => _notify('Favorites filter migration is next.'))),
      ],
    );
  }

  Widget _statCard(IconData icon, String label, String value, Color tint, VoidCallback onTap) {
    return GlassSurface(
      borderRadius: 18,
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 13),
      onTap: onTap,
      child: Column(
        children: [
          Container(
            width: 32,
            height: 32,
            decoration: BoxDecoration(color: tint.withOpacity(0.08), borderRadius: BorderRadius.circular(11)),
            child: Icon(icon, size: 16, color: tint),
          ),
          const SizedBox(height: 6),
          Text(label, style: const TextStyle(fontSize: 8, letterSpacing: 1.15, color: Color(0xFF818B9E))),
          const SizedBox(height: 2),
          Text(value, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, fontFamily: 'monospace')),
        ],
      ),
    );
  }

  Widget _buildFocusCard(int progressPct, int todayMinutes) {
    return GlassSurface(
      borderRadius: 28,
      padding: const EdgeInsets.all(16),
      child: Row(
        children: [
          SizedBox(
            width: 66,
            height: 66,
            child: Stack(
              alignment: Alignment.center,
              children: [
                SizedBox(
                  width: 62,
                  height: 62,
                  child: CircularProgressIndicator(
                    value: progressPct / 100,
                    strokeWidth: 3.2,
                    backgroundColor: const Color(0x1AFFFFFF),
                    valueColor: const AlwaysStoppedAnimation<Color>(Color(0xFF82A1FF)),
                  ),
                ),
                Text(progressPct.toString() + '%', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w800, fontFamily: 'monospace')),
              ],
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Flexible(child: Text('Today’s Focus', maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800))),
                    const SizedBox(width: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
                      decoration: BoxDecoration(color: const Color(0x24F7B955), borderRadius: BorderRadius.circular(999)),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.local_fire_department_rounded, size: 10, color: Color(0xFFFFC86B)),
                          SizedBox(width: 2),
                          Text('Streak', style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, color: Color(0xFFFFD68D))),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 3),
                Text(todayMinutes.toString() + 'm of ' + (_dailyGoalHours * 60).round().toString() + 'm daily goal', style: const TextStyle(fontSize: 9.5, color: Color(0xFF8B95A8))),
              ],
            ),
          ),
          FilledButton.icon(
            onPressed: () {
              setState(() => _todayFocusSeconds += 60);
              _notify('Focus block started locally.');
            },
            style: FilledButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
              backgroundColor: const Color(0x2C7C9AFF),
              foregroundColor: const Color(0xFF99B5FF),
              side: const BorderSide(color: Color(0x5B86A6FF)),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(13)),
              elevation: 0,
            ),
            icon: const Icon(Icons.bolt_rounded, size: 15, color: Color(0xFFFFD08A)),
            label: const Text('Start Focus', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800)),
          ),
        ],
      ),
    );
  }

  Widget _buildContinueStudying() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Icon(Icons.access_time_rounded, size: 15, color: Color(0xFF83A7FF)),
            const SizedBox(width: 6),
            const Expanded(child: Text('CONTINUE STUDYING', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, letterSpacing: 1.4))),
            const Text('Recent notes', style: TextStyle(fontSize: 9, color: Color(0xFF707A8E))),
          ],
        ),
        const SizedBox(height: 11),
        SizedBox(
          height: 146,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            physics: const BouncingScrollPhysics(),
            itemCount: _recentNotes.length,
            separatorBuilder: (_, __) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final note = _recentNotes[index];
              DashboardCourse? course;
              for (final candidate in _courses) {
                if (candidate.id == note.courseId) {
                  course = candidate;
                  break;
                }
              }
              return SizedBox(
                width: 246,
                child: GlassSurface(
                  borderRadius: 20,
                  padding: const EdgeInsets.all(14),
                  onTap: () => _notify('Opening note editor is a later migration step.'),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(child: _courseBadge(course?.name ?? 'General', course?.color ?? 'sky')),
                          if (note.favorite) const Icon(Icons.star_rounded, size: 13, color: Color(0xFFFFC86B)),
                        ],
                      ),
                      const SizedBox(height: 8),
                      Text(note.title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800)),
                      const SizedBox(height: 4),
                      Text(note.body, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 9.5, height: 1.4, color: Color(0xFF8993A8))),
                      const Spacer(),
                      const Divider(height: 14, color: Color(0x0FFFFFFF)),
                      Row(
                        children: [
                          Text(_relativeTime(note.updatedAt), style: const TextStyle(fontSize: 9, color: Color(0xFF717B8F))),
                          const Spacer(),
                          const Text('Resume', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF87A6FF))),
                          const SizedBox(width: 3),
                          const Icon(Icons.arrow_forward_rounded, size: 12, color: Color(0xFF87A6FF)),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }

  Widget _courseBadge(String text, String color) {
    final accent = _accent(color);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 4),
      decoration: BoxDecoration(
        color: accent.$1,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: accent.$2.withOpacity(0.28)),
      ),
      child: Text(text, maxLines: 1, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 8.5, fontWeight: FontWeight.w800, color: accent.$2)),
    );
  }

  Widget _buildCourseToolbar() {
    return Column(
      children: [
        TextField(
          controller: _searchController,
          onChanged: (_) => setState(() {}),
          decoration: const InputDecoration(prefixIcon: Icon(Icons.search_rounded, size: 19), hintText: 'Search course title or description...'),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 34,
                child: ListView.separated(
                  scrollDirection: Axis.horizontal,
                  physics: const BouncingScrollPhysics(),
                  itemCount: _categories.length,
                  separatorBuilder: (_, __) => const SizedBox(width: 6),
                  itemBuilder: (context, index) {
                    final category = _categories[index];
                    return ChoiceChip(
                      label: Text(category == 'all' ? 'All' : category),
                      selected: category == _selectedCategory,
                      onSelected: (_) => setState(() => _selectedCategory = category),
                    );
                  },
                ),
              ),
            ),
            const SizedBox(width: 10),
            FilledButton.icon(
              onPressed: _showCreateCourseSheet,
              style: FilledButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14))),
              icon: const Icon(Icons.add_rounded, size: 16),
              label: const Text('Create Course', style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w800)),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildCourses() {
    final filtered = _filteredCourses;
    if (filtered.isEmpty) {
      return GlassSurface(
        borderRadius: 24,
        padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 30),
        child: const Column(
          children: [
            Icon(Icons.search_off_rounded, size: 32, color: Color(0xFF6F7A8E)),
            SizedBox(height: 10),
            Text('No courses found', style: TextStyle(fontWeight: FontWeight.w800)),
            SizedBox(height: 4),
            Text('Try another search or create a new course.', textAlign: TextAlign.center, style: TextStyle(fontSize: 11, color: Color(0xFF7F899B))),
          ],
        ),
      );
    }

    return Column(
      children: [
        for (final course in filtered) ...[
          _courseCard(course),
          const SizedBox(height: 14),
        ],
      ],
    );
  }

  Widget _courseCard(DashboardCourse course) {
    final accent = _accent(course.color);
    final noteLabel = course.noteCount.toString() + (course.noteCount == 1 ? ' note' : ' notes');

    return GlassSurface(
      borderRadius: 28,
      padding: const EdgeInsets.all(17),
      onTap: () => _notify('Opening “' + course.name + '” workspace is the next migration step.'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 44,
                height: 44,
                decoration: BoxDecoration(
                  color: accent.$1,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: accent.$2.withOpacity(0.34)),
                ),
                child: Icon(Icons.folder_open_rounded, size: 20, color: accent.$2),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Align(
                  alignment: Alignment.topRight,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(color: const Color(0x0FFFFFFF), borderRadius: BorderRadius.circular(999), border: Border.all(color: const Color(0x1AFFFFFF))),
                    child: Text(noteLabel, style: const TextStyle(fontSize: 9.5, fontFamily: 'monospace', color: Color(0xFF8791A5))),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 13),
          Text(course.name, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, letterSpacing: -0.3)),
          const SizedBox(height: 4),
          Text(
            course.description.isEmpty ? 'No description provided' : course.description,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(fontSize: 10.5, height: 1.45, fontStyle: course.description.isEmpty ? FontStyle.italic : FontStyle.normal, color: course.description.isEmpty ? const Color(0xFF5E687A) : const Color(0xFF8993A8)),
          ),
          const SizedBox(height: 11),
          Row(
            children: [
              _courseBadge(course.color, course.color),
              if (course.category.isNotEmpty) ...[
                const SizedBox(width: 6),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(color: const Color(0x0DFFFFFF), borderRadius: BorderRadius.circular(8), border: Border.all(color: const Color(0x12FFFFFF))),
                  child: Text(course.category, style: const TextStyle(fontSize: 8.5, fontWeight: FontWeight.w700, color: Color(0xFF7E889B))),
                ),
              ],
              const Spacer(),
              IconButton(
                tooltip: 'Delete course',
                onPressed: () => _confirmDelete(course),
                icon: const Icon(Icons.delete_outline_rounded, size: 18, color: Color(0xFF7D8799)),
              ),
            ],
          ),
          const Divider(height: 15, color: Color(0x0FFFFFFF)),
          Row(
            children: [
              Text('Edited ' + _relativeTime(course.updatedAt), style: const TextStyle(fontSize: 9, color: Color(0xFF707A8E))),
              const Spacer(),
              const Text('Open Workspace', style: TextStyle(fontSize: 9.5, fontWeight: FontWeight.w700, color: Color(0xFF87A6FF))),
              const SizedBox(width: 4),
              const Icon(Icons.arrow_forward_rounded, size: 13, color: Color(0xFF87A6FF)),
            ],
          ),
        ],
      ),
    );
  }

  (Color, Color) _accent(String color) {
    switch (color) {
      case 'violet':
        return (const Color(0x332F1F55), const Color(0xFFBFA4FF));
      case 'amber':
        return (const Color(0x333C2C0F), const Color(0xFFFFC86B));
      case 'emerald':
        return (const Color(0x3320483A), const Color(0xFF84E9C1));
      case 'rose':
        return (const Color(0x333E1B29), const Color(0xFFFF9DAD));
      case 'cyan':
        return (const Color(0x33203F4A), const Color(0xFF8AE9FF));
      default:
        return (const Color(0x33233C5B), const Color(0xFF8FB4FF));
    }
  }

  Widget _buildBottomDock() {
    final safeBottom = MediaQuery.paddingOf(context).bottom;
    final progress = ((_todayFocusSeconds / (_dailyGoalHours * 3600)) * 100).round().clamp(0, 100).toInt();

    return Padding(
      padding: EdgeInsets.fromLTRB(12, 0, 12, 12 + safeBottom),
      child: GlassSurface(
        borderRadius: 28,
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
        opacity: 0.26,
        blur: 26,
        child: SizedBox(
          height: 68,
          child: Row(
            children: [
              _dockItem(Icons.folder_open_rounded, 'Courses', true, _jumpToCourses),
              _dockItem(Icons.layers_rounded, 'Notes', false, () => _notify('Notes List migration is next.')),
              Expanded(
                child: Center(
                  child: Transform.translate(
                    offset: const Offset(0, -12),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: () => _notify('Quick Note capture is the next editor step.'),
                        customBorder: const CircleBorder(),
                        child: Ink(
                          width: 52,
                          height: 52,
                          decoration: const BoxDecoration(
                            shape: BoxShape.circle,
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [Color(0xFF86A7FF), Color(0xFF61D9B6)],
                            ),
                            boxShadow: [BoxShadow(color: Color(0x554B91FF), blurRadius: 24, offset: Offset(0, 8))],
                            border: Border.fromBorderSide(BorderSide(color: Colors.white24, width: 1)),
                          ),
                          child: Icon(Icons.add_rounded, color: Colors.white, size: 26),
                        ),
                      ),
                    ),
                  ),
                ),
              ),
              _dockItem(Icons.track_changes_rounded, 'Goal', false, () => _notify('Daily Goal migration is next.'), badge: progress.toString() + '%'),
              _dockItem(Icons.more_horiz_rounded, 'Tools', false, () => _notify('Tools migration is planned for a later phase.')),
            ],
          ),
        ),
      ),
    );
  }

  Widget _dockItem(IconData icon, String label, bool active, VoidCallback onTap, {String? badge}) {
    return Expanded(
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(18),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 7),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Stack(
                clipBehavior: Clip.none,
                children: [
                  Container(
                    width: 31,
                    height: 31,
                    decoration: BoxDecoration(
                      color: active ? const Color(0x2C83A7FF) : Colors.transparent,
                      borderRadius: BorderRadius.circular(11),
                    ),
                    child: Icon(icon, size: 16, color: active ? const Color(0xFF8EAEFF) : const Color(0xFF7B8496)),
                  ),
                  if (badge != null)
                    Positioned(
                      right: -6,
                      top: -4,
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 2),
                        decoration: BoxDecoration(color: const Color(0xFFFFC85A), borderRadius: BorderRadius.circular(999)),
                        child: Text(badge, style: const TextStyle(fontSize: 6.5, fontWeight: FontWeight.w900, color: Color(0xFF241900))),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 3),
              Text(label.toUpperCase(), style: TextStyle(fontSize: 7.5, fontWeight: FontWeight.w800, letterSpacing: 1.0, color: active ? const Color(0xFF8EAEFF) : const Color(0xFF7B8496))),
            ],
          ),
        ),
      ),
    );
  }

  String _relativeTime(DateTime time) {
    final diff = DateTime.now().difference(time);
    if (diff.inMinutes < 1) return 'just now';
    if (diff.inMinutes < 60) return diff.inMinutes.toString() + 'm ago';
    if (diff.inHours < 24) return diff.inHours.toString() + 'h ago';
    if (diff.inDays < 2) return 'yesterday';
    return diff.inDays.toString() + 'd ago';
  }
}

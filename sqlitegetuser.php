/*
 * Copyright 2009 Rohit Pidaparthi
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * Author: Rohit Pidaparthi <rohitpid@gmail.com>
 *
 */

<?php
$db = new PDO('sqlite:openhuman.sqlite');
echo "<table border='1'>
<tr>
<th>variable name</th>
<th>collada to load</th>
</tr>";
foreach ($db->query('SELECT * from organs') as $row) 
{
	echo "<tr>";
	echo "<td>" . $row['object name'] . "</td>";
	echo "<td>" . $row['collada file'] . "</td>";
	echo "</tr>";
}
echo "</table>";

?>

